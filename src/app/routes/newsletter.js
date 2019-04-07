const newsletterRouter = require('express').Router();
const Subscriber = require('../models/subscriber');

newsletterRouter.post('/', (req, res, next) => {
    console.log(req.body);
    const newSubscriber = new Subscriber({ email: req.body.email });
    newSubscriber.save((err) => {
        if (err) { return next(err); }
        req.flash('message', 'Successfully subscribed to newsletter.');
        req.session.save((err) => {
            if (err) { return next(err); }
            Subscriber.find((err, subscribers) => {
                if (err) { return next(err); }
                console.log(subscribers);
                res.redirect('/');
            });
            //res.redirect('/');
        });
    });
    /*
    Subscriber.find((err, subscribers) => {
        console.log(subscribers);
    });*/
});

module.exports = newsletterRouter;