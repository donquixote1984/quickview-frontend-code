require('./Header.scss');
const template = require('./Header.hbs');

const Component = require('base/Component');

class Header extends Component {
    name = 'Header'; //eslint-disable-line
    constructor(args) {
        super({ ...args, template });

        this.getGlobalStore().watch('optionChanged', optionData => {
            this.container.find('.quick-view-header-title').removeClass('quick-view-oos-font');
            let formatTitle = optionData.productName; //eslint-disable-line
            if (this.getGlobalStore().getState('firstSelectedOption')) {
                formatTitle += ', ' + this.getGlobalStore().getState('firstSelectedOption').title;//eslint-disable-line
            }
            if (this.getGlobalStore().getState('secondSelectedOption')) {
                formatTitle += ', ' + this.getGlobalStore().getState('secondSelectedOption').title; //eslint-disable-line
            }
            this.setState('title', formatTitle);
            this.container.find('.quick-view-header-title').removeClass('quick-view-txt-gray');
        });
        this.getGlobalStore().watch('oos', () => {
            this.container.find('.quick-view-header-title').addClass('quick-view-txt-gray');
        });
    }
}

module.exports = Header;
