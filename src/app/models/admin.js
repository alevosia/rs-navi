const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    account: {
        email:    String,
        password: String,
        role:         { type: Number, default: 7 },
        created:      { type: Date, default: new Date() },
        lastLoggedin: { type: Date, default: null }
    }
})

/*account roles
0 - Student
1 - Placeowner
7 - Admin
*/

module.exports = mongoose.model('Admin', AdminSchema);