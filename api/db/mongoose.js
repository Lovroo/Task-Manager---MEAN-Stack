//Ta datoteka bo procesirala logiko povezavo do MongoDB baze podatkov

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/TaskManager', { useNewUrlParser: true }).then(() => {
    console.log("Povezava na mongoDB uspešna :)");
}).catch((e) => {
    console.log("Error pri povezavi na MongoDB");
    console.log(e);
});

module.exports = {
    mongoose
};