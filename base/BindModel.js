//  http://stackoverflow.com/questions/12528049/if-a-dom-element-is-removed-are-its-listeners-also-removed-from-memory
//  http://stackoverflow.com/questions/30533854/does-ngclick-attach-a-click-handler-to-every-item-if-put-in-an-ngrepeat
const $ = require('jquery');
class BindModel {
    constructor() {
        this.__watchers__ = {};
        this.__o__ = $({});
    }

    clear() {
        this.__watchers__ = {};
        this.__o__.off();
    }
    subscribe(...args) {
        this.__o__.on(...args);
    }

    unpublish(...args) {
        this.__o__.off.apply(this.__o__, args);
    }

    publish(...args) {
        /**
         * if trigger a array like
         * trigger('eventName', [1,2,3])
         *
         * the on callback function will receive param like this:
         *
         * on('eventName', function(event, a,b,c){
         *  here
         *  a = 1
         *  b = 2
         *  c = 3
         * })
         * so the tricky point is 'a' DOES NOT EQUAL to [1,2,3] but 1!
         * */
        if ($.isArray(args[1])) {
            args[1] = [args[1]];
        }
        this.__o__.trigger(...args);
    }

    watch(key, callback) {
        // watchers just for debug

        if (!this.__watchers__[key]) {
            this.__watchers__[key] = [];
        }

        this.__watchers__[key].push(callback);

        const state = this._walk(key);

        if (state) {
            callback.call(null, state);
        }
        //  add callback for value change(by setState)
        this.subscribe(key, function (e, value) {
            callback.call(null, value);
        });
    }

    //  setDeepState('saleInfos', saleInfos)

    _set(key, value) {
        let state = this.state;
        const nestedKeys = key.split('.');

        for (let i = 0; i < nestedKeys.length - 1; i++) {
            const currentKey = nestedKeys[i];
            const tmp = state[currentKey];
            if (tmp) {
                state = tmp;
            } else {
                state[currentKey] = {};
            }
        }
        state[nestedKeys[nestedKeys.length - 1]] = value;
    }

    /**
     * find the object value by key, support nested object.
     *
     * obj = {a:1, b:2, c:3, d:{aa:1,bb:2}}
     * _walk('a') == 1
     * _walk('d.bb') == 2
     *
     *
     *  if the param assignIfEmpty === true, that means create the key if object has not contains.
     *
     *  eg:
     *
     *  _walk('a.b')// will throw 'key is already a non object value...' exception
     *  _walk('d.cc.b') //will create obj.d.cc.b = undefined properties.
     *
     *
     * convert a 'a.b.c.d' dot notation to a object
     * */
    _walk(key, assignIfEmpty = true) {
        const state = this.state;
        const tempKey = '';
        return key.split('.').reduce((object, _key, index, arr) => {
            if (typeof object !== 'object') {
                throw new Error(`key ${tempKey.substring(1)} is already a non object value, should not have sub properties like ${key}`);
            }
            if (!object[_key]) {
                /**
                 * if assignIfEmpty == true
                 * and
                 * it is not the last '.' attributes
                 *
                 * it will create all the properties before the last '.'
                 * */
                if (assignIfEmpty) {
                    if (arr.length - 1 !== index) {
                        object[_key] = {};
                    }
                } else {
                    throw new Error('error in _walk(), the key "+_key+" does not exist yet');
                }
            }
            return object[_key];

        }, state);

    }


    setDeepState(key, value, isNotRoot) {
        if (value && value.promise) {
            throw new Error('setDeepState does not support promise');
        }

        if (!isNotRoot) {
            this.setState(key, value);
        }

        const prop = this._walk(key);
        if (typeof prop === 'object') {
            for (const i in prop) {
                if (prop.hasOwnProperty(i)) {
                    this.publish(`${key}.${i}`, prop[i]);
                    this.setDeepState(`${key}.${i}`, prop[i], true);
                }
            }
        }
    }

    setState(keyOrObj, value) {
        if (typeof keyOrObj === 'string') {

            this._set(keyOrObj, value);

            if (value && value.promise && value.promise.then) {
                value.promise.then((resolvedValue) => {
                    this.publish(keyOrObj, resolvedValue);
                });
            } else {
                this.publish(keyOrObj, value);
            }
        } else {
            if (typeof keyOrObj === 'object') {
                const obj = keyOrObj;
                Object.assign(this.state, obj);
                if (value) {
                    for (const _key in obj) {
                        if (obj.hasOwnProperty(_key)) {
                            this.publish(_key, obj[_key]);
                        }
                    }
                }
            }
        }
    }
}

module.exports = BindModel;
