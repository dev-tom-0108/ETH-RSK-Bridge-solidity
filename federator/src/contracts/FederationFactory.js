const abiFederationOld = require('../../../bridge/abi/Federation_old.json');
const abiFederationNew = require('../../../bridge/abi/Federation.json');
const abiBridge = require('../../../bridge/abi/Bridge.json');
const FederationInterfaceV1 = require('./IFederationV1.js');
const FederationInterfaceV2 = require('./IFederationV2.js');
const CustomError = require('../lib/CustomError');
const utils = require('../lib/utils');
const ContractFactory = require('./ContractFactory');

module.exports = class FederationFactory extends ContractFactory {

    constructor(config, logger, Web3) {
        super(config, logger, Web3)
        this.mainChainBridgeContract = new this.mainWeb3.eth.Contract(abiBridge, this.config.mainchain.bridge);
        this.sideChainBridgeContract = new this.sideWeb3.eth.Contract(abiBridge, this.config.sidechain.bridge);
    }

    async createInstance(web3, address) {
        let federationContract = this.getContractByAbi(abiFederationNew, address, web3);
        const version = await this.getVersion(federationContract);

        if (version === 'v2') {
            return new FederationInterfaceV2(this.config, federationContract);
        } else if (version === 'v1') {
            federationContract = this.getContractByAbi(abiFederationOld, address, web3);
            return new FederationInterfaceV1(this.config, federationContract);
        } else {
            throw Error('Unknown Federation contract version');
        }
    }

    async getVersion(federationContract) {
        try {
            return await utils.retry3Times(federationContract.methods.version().call);
        } catch(err) {
            return "v1";
        }
    }

    async getMainFederationContract() {
        try {
            const federationAddress = await utils.retry3Times(this.mainChainBridgeContract.methods.getFederation().call);
            return await this.createInstance(
                this.mainWeb3,
                federationAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Main Federation Contract`, err);
        }
    }

    async getSideFederationContract() {
        try {
            const federationAddress = await utils.retry3Times(this.sideChainBridgeContract.methods.getFederation().call);
            return await this.createInstance(
                this.sideWeb3,
                federationAddress
            );
        } catch(err) {
            throw new CustomError(`Exception creating Side Federation Contract`, err);
        }
    }
}
