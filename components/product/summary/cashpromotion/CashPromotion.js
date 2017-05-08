const template = require('./CashPromotion.hbs');
const Component = require('base/Component');
class CashPromotion extends Component {
    name = 'CashPromotion'; //eslint-disable-line
    constructor(args) {
        super({ ...args, template });
    }
}

module.exports = CashPromotion;
