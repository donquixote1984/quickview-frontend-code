const coulog = require('couLog');
const $ = require('jquery');
const essentialData = require('../../../common/essentialData.js');

const _LogFunc = {
    extraParam: {
        page: 'SDP',
        type: 'sdpQuickView'
    },
    url(url) {
        this.customURL = url;
        return this;
    },

    label(label) {
        this.logLabel = label;
        this.extraParam.contents = label;
        return this;
    },
    contents(contents) {
        return this.label(contents);
    },
    param(p) {
        Object.assign(this.extraParam, p);
        return this;
    },
    send() {
        if (!this.logLabel) {
            this.label('sdpQuickViewPopUp');
        }
        if (!this.customURL) {
            throw new Error('coulog need a custom URL');
        }

        if (!this.logType) {
            throw new Error('coulog need a log type');
        }

        if (essentialData.getState('invalidProduct')) {
            this.extraParam.invalid = true;
        }
        //  couLog.execManualLogging({"logCategory":"impression", "logType":"", "logLabel":"", "customURL":"/impression_brand_new_product", "extraParam":"brandId=" + brandId});
        coulog.execManualLogging({
            logCategory: this.logCategory,
            logType: this.logType,
            logLabel: this.logLabel,
            customURL: this.customURL,
            extraParam: $.param(this.extraParam)
        });
        return this;
    }
};

const LogUtils = {

    impression() {
        const logObj = {
           logCategory: 'view',
            logType: 'impression'
        };
        return Object.assign(logObj, _LogFunc);
    },
    click() {
        const logObj = {
            logType: 'click',
            logCategory: 'event'
        };
        return Object.assign(logObj, _LogFunc);
    },
    scroll() {
        const logObj = {
            logType: 'scroll',
            logCategory: 'event'
        };
        return Object.assign(logObj, _LogFunc);
    }
};
module.exports = LogUtils;
