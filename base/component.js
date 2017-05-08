const BindModel = require('BindModel');
const req = require.context('../components', true);
class Component extends BindModel {
    name;
    container;
    state;
    template;
    globalStore;
    components=[];
    parent= null;

    constructor({ template, element, data = {}, globalStore }) {
        super();
        [this.state, this.template, this.container, this.globalStore] = [data, template, element, globalStore];
    }

    build(initialState = {}, element) {
        /**
         * here need to check if the initialState is a plain object, if the initialState is a Array(in cashPromotion component),
         * Object.assign() will transfer the array to a new object like [1,2,3] to {0:1, 1:2, 2:3}
         * */
        if (!$.isPlainObject(initialState)) {
            this.state = initialState;
        } else {
            Object.assign(this.state, initialState);
        }
        if (element) {
            this.container = element;
        }
        this.beforeConstruct(initialState).then(() => {
            this.render();
        });

        return this;
    }

    render() {

        const html = this.template(this.state);

        /**
         * if it is the container is a <component> , just use a <tagName> instead
         * */
        if (this.container.is('component')) {

            const [className, tagName = 'div'] = [this.container.attr('className'), this.container.attr('tagName')];

            const node = $(`<${tagName}></${tagName}>`);

            this.container.empty().append(node);

            node.unwrap();

            this.container = node;


            if (className) {
                className.split(' ').forEach(_cn => this.container.addClass(_cn));
            }
        }

        this.container.empty().html(html);
        this.parse();
        this.afterConstruct();
    }

    parse() {
        const [componentList, dataBindingList] = [this.container.find('component'), this.container.find('[data-bind]')];
        dataBindingList.each((index, bind) => {

            const name = $(bind).attr('data-bind');
            this.watch(name, function (value) {
                /**
                 *
                 *
                 * if(value.promise){
                    value.promise.then((obj)=>{
                        if(obj instanceof $){
                            dom.empty.append(obj)
                        }
                        else{
                            dom.html(obj);
                        }
                    })
                }
                 else{
                    if(value instanceof $){
                        dom.empty().append(value);
                    }
                    else{
                        dom.html(value);
                    }
                }


                 * Originally we use a Promise, since we just downgrade the syntax to compat ie8 , we just use jquery.Deferred,
                 * so here for convenience, we just use a $.when to handle all cases.
                 * */
                $.when(value).then((obj) => {
                    if (obj instanceof $) {
                        $(bind).empty().append(obj);
                    } else {
                        $(bind).html(obj);
                    }
                });
            });
        });

        componentList.each((index, obj) => {

            const [name, bind] = [$(obj).attr('name'), $(obj).attr('bind')];
            let dataKey = $(obj).attr('data');
            let component;
            if (typeof dataKey === 'string') {
                dataKey = dataKey.trim();
            }
            if (this.components[index]) {
                component = this.components[index].clear();
                /**
                 * BUT, for now the component.container is already be removed!  need to reset the container to the current '<component>'
                 * */
                component.container = $(obj);
                //  component.setGlobalStore(this.getGlobalStore());
            } else {
                const ComponentClass = req(name);
                component = new ComponentClass({
                    element: $(obj),
                    data: dataKey === '.' ? {...this.state} : {...this.state[dataKey]},
                    globalStore: this.getGlobalStore()
                });
                component.parent = this;
            }

            if (typeof bind !== 'undefined' && bind !== false) {
                if (dataKey === '.') {
                    throw new Error(`For performance issue, component ${name} referenced by component ${this.name} can not contains all the data from parent by a data="." and a bind tag`);
                } else {
                    this.watch(dataKey, (value) => {
                        /**
                         * well , the trap is : the child component does not aware what the dataKey is, just transfer all
                         * the attribute of this.state[dataKey], so it just like Object.assign(child.state, parent.state[dataKey]);
                         *
                         * rather than:
                         *
                         * Object.assign(child.state, {[dataKey]: prent.state[dataKey]});
                         *
                         * so here just use
                         * component.update(value)
                         * rather than
                         * component.update({[dataKey]:value})
                         * */
                        //  component.upate({[dataKey]: value});
                        component.update(value);
                    });
                }
            } else {
                component.build(dataKey === '.' ? {...this.state} : {...this.state[dataKey]});
            }

            this.components[index] = component;

        });
    }

    template() {
        return this.template;
    }

    html() {
        return this.el;
    }

    $html() {
        return this.$el;
    }
    update(obj) {
        this.build(obj);
    }
    getState(key) {
        //  TODO add nested supported
        if (key) {
            return this.state[key];
        }
        return this.state;
    }

    beforeConstruct() {

        const deferred = $.Deferred();// eslint-disable-line
        return deferred.resolve();
    }
    afterConstruct() {}

    clear() {
        this.state = {};
        return this;
    }
    getContainer() {
        return this.container;
    }
    setGlobalStore(store) {
        this.globalStore = store;
    }
    getGlobalStore() {
        return this.globalStore;
    }
}

module.exports = Component;
