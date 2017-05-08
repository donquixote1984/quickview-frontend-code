const $ = require('jquery');
const SpeedChecker = require('speedChecker');

/**
 *
 *  var speedChecker;
 if (speedCheckParams) {
            speedChecker = new SpeedChecker(speedCheckParams);
            speedChecker.startServer();
        }
 $.ajax({
            url: url,
            success: function(result){
                if (speedChecker) {
                    speedChecker.endServer();
                    if (result) {
                        speedChecker.checkRendering('.prod-shipping-consolidation');
                        speedChecker.track();
                    }
                }
 *
 * */
/**
 *  request(url).addSpeedChecker(param).then((json)=>{
 *
 *  })
 *
 * */
module.exports = function request(url) {
    const requestObj = {

        sendSpeedChecker: false,
        defaultSpeedCheckerParam: {
            page: 'SDP',
            type: 'brandSDP',
            method: 'async',
            keyName: 'productId',
            key: '',
            contents: ''
        },
        speedChecker(param) {
            this.sendSpeedChecker = true;
            this.speedCheckerParam = Object.assign(this.defaultSpeedCheckerParam, param);
            return this;
        },
        speedCheckerRender(renderNode) {
            this.sendSpeedChecker = true;
            if (!this.speedCheckerParam) {
                this.speedCheckerParam = this.defaultSpeedCheckerParam;
            }
            this.checkRenderingNode = renderNode;
            return this;
        },
        makeRequest() {
            if (!this.ajaxDefer) {
                if (this.sendSpeedChecker) {
                    this._speedChecker = new SpeedChecker(this.speedCheckerParam);
                    this._speedChecker.startServer();
                }
                this.ajaxDefer = $.getJSON(url).done(() => {
                    if (this._speedChecker) {
                        this._speedChecker.endServer();
                        if (this.checkRenderingNode) {
                            this._speedChecker.checkRendering(this.checkRenderingNode);
                        }
                        this._speedChecker.track();
                    }
                });
            }
        },
        then(cb) {
            this.makeRequest();
            this.ajaxDefer.then(cb);
            return this;
        },

        fail(cb) {
            this.makeRequest();
            this.ajaxDefer.fail(cb);
            return this;
        },
        done(cb) {
            this.makeRequest();
            this.ajaxDefer.done(cb);
            return this;
        },
        always(cb) {
            this.makeRequest();
            this.ajaxDefer.always(cb);
            return this;
        },
        defer() {
            this.makeRequest();
            return this.ajaxDefer;
        },
        promise() {
            this.makeRequest();
            return this.ajaxDefer.promise();
        }
    };

    return requestObj;
};
