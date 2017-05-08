const $ = require('jquery');
const BindModel = require('../base/BindModel');
class GlobalStore extends BindModel {
    state = {};

    getCurrentState() {
        return this.state;
    }

    broadcast(...args) {

        if (!args[0]) {
            return;
        }
        if (!args[1]) {

            //  only has a event name like: globalStore.broadcast('blur'), globalstore.broadcast('close');
            this.publish(...args);
        } else {
        /**
         * broadcast only support 2 params,
         * first is broadcast name
         * second is callback fun,
         * does not support multiple broadcast name yet!
         * */

            const eventList = args[0];
            if ($.isArray(eventList)) {
                for (let i = 0; i < eventList.length; i++) {
                    /**
                     * just use $.when to handle directly data or jquery deferred data
                     * */
                    $.when(...args.slice(1)).then((...values) => {
                        /**
                         * because $.when(defer, defer,defer).then((...args)=>{})
                         * the args will be [Array[3],  Array[3], Array[3]]
                         * each item is a jquery ajax return object.
                         * we just need the Array[0]
                         * */
                        const _values = values.map((obj) => {
                            if ($.isArray(obj)) {
                                return obj[0];
                            }
                            return obj;
                        });
                        this.publish(eventList[i], ..._values);
                    });
                }
            } else if (typeof eventList === 'string') {
                /**
                 * just use $.when to handle directly data or jquery deferred data
                 * */
                $.when(...args.slice(1)).then((...values) => {
                    /**
                     * because $.when(defer, defer,defer).then((...args)=>{})
                     * the args will be [Array[3], Array[3], Array[3]]
                     * each item is a jquery ajax return object.
                     * we just need the Array[0]
                     * */
                    const _values = values.map((obj) => {
                        if ($.isArray(obj)) {
                            return obj[0];
                        }
                        return obj;
                    });
                    this.publish(eventList, ..._values);
                });
            }
        }
    }

    clear() {
        this.state = {};
        return this;
    }

    //  TODO: add nested support
    getState(key) {
        return this.state[key];
    }

    getStateObject(...keys) {
        const obj = {};
        keys.forEach((key) => {
           obj[key] = this.state[key];
        });
        return obj;
    }
    getIds() {
        return this.getStateObject('productId', 'vendorItemId', 'itemId');
    }
    assignState(key, value) {
        this.state[key] = value;
    }
}

module.exports = GlobalStore;
