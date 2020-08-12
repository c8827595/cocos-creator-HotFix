//熱更新管理者 Created by CCKuo 2020/8/11

//PS.可使用 1.new 2.單例
//1.
//var FHotUpdateHandler = new HotUpdateHandler(); //熱更管理者

//2.
//window.HotUpdateManager.getInstance();
var HotUpdateHandler = function(){
    this.HotUpdateUrl = ""; //熱更新遠程地址
    this._storagePath = ""; //熱更新資源存放位置
};

//初始化 設定遠程熱更新位址
HotUpdateHandler.prototype.init = function(Url){
    cc.log("安安")
    this.HotUpdateUrl = Url;
    this._storagePath = this.getSavePath();
    this.UpdateLocalConfigUrl(); //先更新地址
};

//取得熱更新資源位置
HotUpdateHandler.prototype.getSavePath = function () {
    let path = ""; 
    path = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + '21-remote-asset'; 
    return path;
}

//比對版本
HotUpdateHandler.prototype.VersionCompareHandle = function () {
    let handle = function (versionA, versionB) { };
    if (this.Test) {
        return handle
    }
    else{
        handle = function (versionA, versionB) {
            //檢查目前配置的版型
            var vA = versionA.split('.');
            var vB = versionB.split('.');
            for (var i = 0; i < vA.length; ++i) {
                var a = parseInt(vA[i]);
                var b = parseInt(vB[i] || 0);
                if (a === b) {
                    continue;
                }
                else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            }
            else {
                return 0;
            }
        };
        return handle;
    }
}

//全更機制 更改本地目录的 更新地址
HotUpdateHandler.prototype.UpdateLocalConfigUrl = function () {
    if (this._updating) {
        return;
    }
    this._updating = true;
    this._storagePath = this.getSavePath();

    if (!jsb.fileUtils.isDirectoryExist(this._storagePath)) {
        jsb.fileUtils.createDirectory(this._storagePath);
    }

    this.project_storagePath = this._storagePath + '/project.manifest';

    //删除临时配置文件
    if (jsb.fileUtils.isDirectoryExist(this.temp_storagePath)) {
        jsb.fileUtils.removeDirectory(this.temp_storagePath);
    }
    if (jsb.fileUtils.isFileExist(this.temp_storagePath)) {
        jsb.fileUtils.removeFile(this.temp_storagePath);
    }

    //修改本地文件
    let jsonData = {
        "packageUrl": "http://xxx.xxx/cocos-hu/ly/",
        "remoteManifestUrl": "http://xxx.xxx/cocos-hu/ly/project.manifest",
        "remoteVersionUrl": "http://xxx.xxx/cocos-hu/ly/version.manifest",
        "version": "0.0.0",
        "assets": {
        },
        "searchPaths": [
        ]
    };
    jsonData.packageUrl = this.HotUpdateUrl;
    jsonData.remoteManifestUrl = this.HotUpdateUrl + "project.manifest";
    jsonData.remoteVersionUrl = this.HotUpdateUrl + "version.manifest";

    let writeData = JSON.stringify(jsonData);
    if (jsb.fileUtils.isDirectoryExist(this.project_storagePath)) {
        jsb.fileUtils.removeDirectory(this.project_storagePath);
    }
    //模拟器测试 出现过没删掉的情况  加个二次删除  预防
    if (jsb.fileUtils.isFileExist(this.project_storagePath)) {
        jsb.fileUtils.removeFile(this.project_storagePath);
    }
    jsb.fileUtils.writeStringToFile(writeData, this.project_storagePath);
    this.manifestUrl = this.project_storagePath;
    this.HotUpdatePrepare();
};


//比對版本號Function設定 更新前Task初始化
HotUpdateHandler.prototype.HotUpdatePrepare = function () {
    this.versionCompareHandle = this.VersionCompareHandle();
    this._am = new jsb.AssetsManager("", this._storagePath, this.versionCompareHandle);
    this._am.setVerifyCallback(function (path, asset) {
        // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
        var compressed = asset.compressed;
        // Retrieve the correct md5 value.
        var expectedMD5 = asset.md5;
        // asset.path is relative path and path is absolute.
        var relativePath = asset.path;
        // The size of asset file, but this value could be absent.
        var size = asset.size;
        if (compressed) {
            return true;
        }
        else {
            return true;
        }
    });

    if (cc.sys.os === cc.sys.OS_ANDROID) {
        this._am.setMaxConcurrentTask(2);
    }

    this.checkUpdate(); //目前是先自動偵測 
};

//檢查需不需要更新
HotUpdateHandler.prototype.checkUpdate = function () {
    if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
        this._am.loadLocalManifest(this.manifestUrl);
    }

    if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
        return;
    }
    this._am.setEventCallback(this.checkCb.bind(this));
    this._am.checkUpdate();
};


//检查更新狀態回傳
HotUpdateHandler.prototype.checkCb = function (event) {
    let failed = false;
    let successed = false;
    let txt = "";
    let status = -1;
    switch (event.getEventCode()) {
        case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
            // 未發現本地配置文件
            failed = true;
            txt =  "No local manifest file found, hot update skipped.";
            break;
        case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
        case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
            failed = true;
            txt = "Fail to download manifest file, hot update skipped.";
            break;
        case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
            successed = true;
            status = "Already up to date with the latest remote version.";
            break;
        case jsb.EventAssetsManager.NEW_VERSION_FOUND:
            successed = true;
            status ='New version found, please try to update.';
            break;
        default:
            return;
    }

    if (successed) {
       console.log("successed "+status)
       this._updating = false;
    } else if (failed) {
        console.log("failed "+txt)
        this._updating = false;
    }
};

//開始更新
HotUpdateHandler.prototype.hotUpdate = function () {
    console.log(this._am)
    console.log(this._updating)
    if (this._am && !this._updating) {
        console.log(1111111222)
        this._am.setEventCallback(this.updateCb.bind(this));
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            var url = this.manifestUrl.nativeUrl;
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            this._am.loadLocalManifest(url);
        }
        this._failCount = 0;
        this._am.update();
        this._updating = true;
    }
};

//更新狀態回傳
HotUpdateHandler.prototype.updateCb = function (event) {
    let failed = false;
    let successed = false;
    let txt = "";
    let needRestart = false;
    switch (event.getEventCode()) {
        case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
            failed = true;
            txt = 'No local manifest file found, hot update skipped.';
            break;
        case jsb.EventAssetsManager.UPDATE_PROGRESSION:
            var percent = event.getPercent();
            if (isNaN(percent)) percent = 0;
            txt = percent;
            return;
        case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
        case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
            failed = true;
            txt = 'Fail to download manifest file, hot update skipped.';
            break;
        case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
            successed = true;
            txt = 'Already up to date with the latest remote version.';
            break;
        case jsb.EventAssetsManager.UPDATE_FINISHED:
            successed = true;
            needRestart = true;
            txt = 'Update finished. ' + event.getMessage();
            break;
        case jsb.EventAssetsManager.UPDATE_FAILED:
            failed = true;
            txt = 'Update failed. ' + event.getMessage();
            break;
        default:
            console.log("Game hot update other case: ", event.getEventCode());
            break;
    }
    if (successed) {       
        console.log("Update successed")
        this._am = null;
    }

    if (needRestart) {
        this._updateListener = null;

        cc.audioEngine.stopAll();
        cc.game.restart();
    }

    if (failed) {
        console.log(txt)
        this._am.setEventCallback(null);
        this._updateListener = null;
        this._updating = false;
    }
};

module.exports = HotUpdateHandler;

//單例模式
var GameHotUpdateUnit = (function () {
    var Instance;

    function GetInstance() {
        if (Instance === undefined) {
            Instance = new HotUpdateHandler();
        }
        return Instance;
    }

    return {
        GetInstance: GetInstance
    }
})();

window.HotUpdateManager = GameHotUpdateUnit;
