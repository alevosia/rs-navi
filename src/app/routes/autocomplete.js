const autocompleteRouter = require('express').Router();
const School = require('../models/school');

function regexEscape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

autocompleteRouter.get('/schools', (req, res) => {
    const query = regexEscape(req.query.query);
    const regex = new RegExp(query, 'i');

    let schools = [];

    School.find({ 'name': {$regex : regex}}, (err, result) => {
        if (err) {
            console.log(err);
            return res.json(null);
        }

        result.forEach((school, index, array) => {
            schools.push(school.name);
        })

        schools.sort();
        const response = { suggestions: schools }
        res.json(response);
    })
})

autocompleteRouter.get('/*', (req, res) => {
    res.status(404).render('404');
})

module.exports = autocompleteRouter;