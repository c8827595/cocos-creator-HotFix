var HotUpdateHandler = require("HotUpdateHandler");

cc.Class({
    extends: cc.Component,

    properties: {

    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        if (!cc.sys.isNative) { //非原生還想更新R
            return;
        }
        this.HotUpdateUrl = "http://127.0.0.1:7777/versions/ver_3_0/" //熱更新網址
        window.HotUpdateManager.GetInstance().init(this.HotUpdateUrl);

    },

    //開始熱更新
    HotUpdate (){
        window.HotUpdateManager.GetInstance().hotUpdate();
    },

    start () {

    },

    // update (dt) {},
});
