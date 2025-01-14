import { EventEmitter } from 'events';

import { NetworkId } from '@synthetixio/contracts-interface';
import { Provider as EthCallProvider } from 'ethcall';
import { ethers } from 'ethers';

import { ContractMap, ContractName, getContractsByNetwork } from './contracts';
import ExchangeService from './services/exchange';
import FuturesService from './services/futures';
import SynthsService from './services/synths';
import TransactionsService from './services/transactions';

export default class KwentaSDK {
	public provider: ethers.providers.Provider;
	public signer?: ethers.Signer;
	public multicallProvider = new EthCallProvider();
	public walletAddress?: string;
	public networkId: NetworkId;
	public contracts: ContractMap;
	public events = new EventEmitter().setMaxListeners(100);

	public exchange: ExchangeService;
	public futures: FuturesService;
	public synths: SynthsService;
	public transactions: TransactionsService;

	constructor(networkId: NetworkId, provider: ethers.providers.Provider, signer?: ethers.Signer) {
		this.networkId = networkId;
		this.provider = provider;
		this.signer = signer;
		this.multicallProvider.init(this.provider);
		this.contracts = this.getContracts();

		if (signer) {
			this.setSigner(signer);
		}

		this.exchange = new ExchangeService(this);
		this.futures = new FuturesService(networkId);
		this.synths = new SynthsService(this);
		this.transactions = new TransactionsService(this);
	}

	public async setProvider(provider: ethers.providers.Provider) {
		this.provider = provider;
		this.multicallProvider.init(provider);
		const networkId = (await provider.getNetwork()).chainId as NetworkId;
		await this.setNetworkId(networkId);

		return networkId;
	}

	public async setSigner(signer: ethers.Signer) {
		this.walletAddress = await signer.getAddress();
		this.signer = signer;
	}

	private async setNetworkId(networkId: NetworkId) {
		this.networkId = networkId;
		await this.exchange.getOneInchTokens();
		this.contracts = this.getContracts();
	}

	private getContracts() {
		const contracts = getContractsByNetwork(this.networkId);

		return Object.entries(contracts).reduce((acc, [name, contract]) => {
			acc[name as ContractName] = contract.connect(this.provider);
			return acc;
		}, {} as ContractMap);
	}
}
