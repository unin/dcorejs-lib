"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require("./GrapheneApi");

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
} // var { List } = require("immutable");


var inst = void 0;

/**
 Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

 Import: import { Apis } from "@graphene/chain"

 Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

 Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
 */

exports.default = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
     @arg {string} cs is only provided in the first call
     @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
     */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (inst) {
            inst.close();
            inst = null;
        }
        inst = new ApisInstance();
        inst.setRpcConnectionStatusCallback(this.statusCb);

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            inst.close();
            inst = null;
        }
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    /** @arg {string} connection .. */
    ApisInstance.prototype.connect = function connect(cs) {
        var _this = this;

        // console.log("INFO\tApiInstances\tconnect\t", cs);

        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb);

        this.init_promise = new Promise(function (resolve, reject) {
            _this.ws_rpc.login(rpc_user, rpc_password)
                .then(function () {
                    // console.log("Login done");
                    _this._db = new _GrapheneApi2.default(_this.ws_rpc, "database");
                    _this._net = new _GrapheneApi2.default(_this.ws_rpc, "network_broadcast");
                    _this._hist = new _GrapheneApi2.default(_this.ws_rpc, "history");
                    _this._crypt = new _GrapheneApi2.default(_this.ws_rpc, "crypto");
                    var db_promise = _this._db.init().then(function () {
                        //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                        return _this._db.exec("get_chain_id", [])
                            .then(function (_chain_id) {
                                _this.chain_id = _chain_id;
                                return _ChainConfig2.default.setChainId(_chain_id);
                                //DEBUG console.log("chain_id1",this.chain_id)
                            });
                    });
                    _this.ws_rpc.on_reconnect = function () {
                        _this.ws_rpc.login("", "")
                            .then(function () {
                                _this._db.init()
                                    .then(function () {
                                        if (_this.statusCb) _this.statusCb("reconnect");
                                    });
                                _this._net.init();
                                _this._hist.init();
                                _this._crypt.init();
                            });
                    };
                    Promise.all([db_promise, _this._net.init(), _this._hist.init(), _this._crypt.init()
                            // Temporary squash crypto API error until the API is upgraded everywhere
                            .catch(function (e) {
                                return console.error("ApiInstance\tCrypto API Error", e);
                            })
                        ])
                        .then(res => {
                            resolve(res);
                        });
                })
                .catch(er => {
                    reject(er);
                });
        });
    };

    ApisInstance.prototype.close = function close() {
        if (this.ws_rpc) this.ws_rpc.close();
        this.ws_rpc = null;
    };

    ApisInstance.prototype.db_api = function db_api() {
        return this._db;
    };

    ApisInstance.prototype.network_api = function network_api() {
        return this._net;
    };

    ApisInstance.prototype.history_api = function history_api() {
        return this._hist;
    };

    ApisInstance.prototype.crypto_api = function crypto_api() {
        return this._crypt;
    };

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];