import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { MetaTransactionData, OperationType } from '@safe-global/types-kit';
import { ethers } from 'ethers';

@Injectable()
export class SafeService implements OnModuleInit {
  private readonly logger = new Logger(SafeService.name);

  private proposerPrivateKey: string;
  private rpcUrl: string;
  private chainId: bigint;
  private contractAddress: string;
  private safeAddress: string;

  private mintInterface: ethers.utils.Interface;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.proposerPrivateKey = this.config.getOrThrow<string>('PROPOSER_PRIVATE_KEY');
    this.rpcUrl = this.config.getOrThrow<string>('RPC_URL');
    this.chainId = BigInt(this.config.getOrThrow<string>('CHAIN_ID'));
    this.contractAddress = this.config.getOrThrow<string>('CONTRACT_ADDRESS');
    this.safeAddress = this.config.getOrThrow<string>('SAFE_ADDRESS');

    this.mintInterface = new ethers.utils.Interface([
      'function mint(address to, uint256 amount)',
    ]);

    const wallet = new ethers.Wallet(this.proposerPrivateKey);
    this.logger.log(`Safe service initialized. Proposer: ${wallet.address}, Safe: ${this.safeAddress}`);
  }

  /**
   * Propone una transaccion mint() en la Safe Multisig.
   * @param to Direccion de la wallet destino (usuario)
   * @param amount Cantidad de BOBH como string decimal (ej: "100.50")
   * @returns safeTxHash de la propuesta creada
   */
  async proposeMintTransaction(to: string, amount: string): Promise<string> {
    // 1. Encodear la llamada mint(to, amountInSmallestUnit)
    //    El contrato usa 6 decimales
    const amountParsed = ethers.utils.parseUnits(amount, 6);
    const mintData = this.mintInterface.encodeFunctionData('mint', [to, amountParsed]);

    this.logger.log(
      `Proposing mint: to=${to}, amount=${amount} BOBH (${amountParsed.toString()} raw), contract=${this.contractAddress}`,
    );

    // 2. Inicializar Protocol Kit conectado a la Safe
    const protocolKit = await Safe.init({
      provider: this.rpcUrl,
      signer: this.proposerPrivateKey,
      safeAddress: this.safeAddress,
    });

    // 3. Crear la transaccion Safe
    const txData: MetaTransactionData = {
      to: this.contractAddress,
      value: '0',
      data: mintData,
      operation: OperationType.Call,
    };

    const safeTransaction = await protocolKit.createTransaction({
      transactions: [txData],
    });

    // 4. Obtener hash y firmar
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const signature = await protocolKit.signHash(safeTxHash);

    // 5. Proponer via API Kit
    const apiKit = new SafeApiKit({ chainId: this.chainId });

    const proposerWallet = new ethers.Wallet(this.proposerPrivateKey);

    await apiKit.proposeTransaction({
      safeAddress: this.safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: proposerWallet.address,
      senderSignature: signature.data,
      origin: 'HUNBOLI Backend',
    });

    this.logger.log(`Transaction proposed successfully. safeTxHash=${safeTxHash}`);

    return safeTxHash;
  }
}
