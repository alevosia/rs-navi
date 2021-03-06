const mongoose = require('mongoose');
const generate = require('../../bin/generator');
const logger = require('../../config/logger');
const formatDate = require('../../bin/date-formatter');

const Image = require('./image');

const PlaceSchema = new mongoose.Schema({
    _id: { type: String, default: () => generate() },
    createdAt: { type: Date, default: () => new Date() },
    status: { type: Number, default: 1 },
    updated: { type: Date, default: null },
    owner: { type: String, ref: 'User', required: true },
    name: { type: String, required: true },
    placeType: { type: Number, required: true },
    address: {
        number: { type: String, required: true },
        street: { type: String, required: true },
        subdivision: { type: String, default: null },
        barangay: { type: String, default: null },
        city: { type: String, required: true },
        zipCode: { type: String, default: null },
        province: { type: String, required: true },
    },
    price: { type: Number, required: true },
    listType: { type: Number, required: true },
    floors: { type: Number, default: null },
    bedrooms: { type: Number, default: null },
    bathrooms: { type: Number, default: null },
    area: { type: Number, default: null },
    description: { type: String, required: true },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    images: [{ type: String, ref: 'Image', required: true}]
})

PlaceSchema.index({ owner: 1 });

PlaceSchema.on('index', (err) => {
    logger.info(err);
});

/* status:      /* types:
0 - deleted     0: boarding house
1 - visible     1: dormitory
                2: apartment
                3: condominium

0 - Rent/Sell
1 - Rent
2 - Sell        
*/

PlaceSchema.virtual('fullAddress').get(function() {
    const { number, street, subdivision, barangay, city, zipCode, province } = this.address;
    return `${number} ${street}, ${subdivision ? `${subdivision},` : ''} ` +
    `${barangay?`Bgy. ${barangay},`:''} ` +
    `${city}, ${zipCode?`${zipCode}`:''} ${province}`;
});

PlaceSchema.virtual('placeTypeString').get(function() {
    switch(this.placeType)
    {
        case 0: return 'Boarding House';
        case 1: return 'Dormitory';
        case 2: return 'Apartment';
        case 3: return 'Condominium';
        default: return 'Unknown Place Type';
    }
});

PlaceSchema.virtual('listTypeString').get(function() {
    switch(this.listType)
    {
        case 0: return 'Rent/Sale';
        case 1: return 'Rent';
        case 2: return 'Sale';
        default: return 'Unknown List Type';
    }
});

PlaceSchema.virtual('createdAtString').get(function() {
    return formatDate(this.createdAt);
});

PlaceSchema.virtual('updatedString').get(function() {
    return formatDate(this.updated);
});

// reviews must be populated to get the number of stars
// TODO: Use Array.reduce()
PlaceSchema.virtual('stars').get(function() {
    if (!this.reviews || this.reviews.length === 0) { return 0 }

    let stars = 0;
    for (review of this.reviews) {
        stars += review.rating;
    }
    return stars / this.reviews.length;
});

// populate virtual
PlaceSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'place',
    options: {
        match: { 'status': 1 }
    }
});

PlaceSchema.virtual('reports', {
    ref: 'Report',
    localField: '_id',
    foreignField: 'target'
});

function createImage(file, id) {
    return new Promise((resolve, reject) => {

        const image = new Image({
            filename: file.filename,
            url: `/places/${id}/images/` + file.filename,
            contentType: file.mimetype
        });

        image.save(err => {
            if (err) { return reject(err); }
            resolve(image._id);
        });
    })
}

PlaceSchema.methods.addImages = function(files, callback) {

    const promises = [];
    
    for (file of files) {
        promises.push(createImage(file, this._id));
    }
    
    Promise.all(promises).then((images) => {
        console.log(images);
        this.images = this.images.concat(images);
        this.save(callback);
    }).catch(err => {
        logger.error(err.stack);
        callback(err);
    });
}

PlaceSchema.methods.removeImage = function(id, callback) {
    this.images.pull(id);
    this.save(callback);
}

PlaceSchema.methods.delete = function(callback) {
    this.status = 0;
    this.save(callback);
}


module.exports = mongoose.model('Place', PlaceSchema);
