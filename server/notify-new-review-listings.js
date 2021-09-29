

require('dotenv').config();
sdkTypes=require('./api-util/sdk')
const fs = require('fs');


const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const { UUID } = sdkTypes;

const integrationSdk = flexIntegrationSdk.createInstance({
  // These two env vars need to be set in the `.env` file.
  clientId: process.env.FLEX_INTEGRATION_CLIENT_ID,
  clientSecret: process.env.FLEX_INTEGRATION_CLIENT_SECRET,
  baseUrl: process.env.FLEX_INTEGRATION_BASE_URL || 'https://flex-integ-api.sharetribe.com',

});

// Start polloing from current time on, when there's no stored state
const startTime = new Date();

// Polling interval (in ms) when all events have been fetched. Keeping this at 1
// minute or more is a good idea. In this example we use 10 seconds so that the
// data is printed out without too much delay.
const pollIdleWait = 10000;
// Polling interval (in ms) when a full page of events is received and there may be more
const pollWait = 250;

// File to keep state across restarts. Stores the last seen event sequence ID,
// which allows continuing polling from the correct place
const stateFile = './notify-new-review-listings.state';

const queryEvents = (args) => {
  console.log('this is queryEvents');
  var filter = { eventTypes: 'review/created' };
  return integrationSdk.events.query(
    { ...args, ...filter },
  );
};

const saveLastEventSequenceId = (sequenceId) => {
  try {
    fs.writeFileSync(stateFile, sequenceId.toString());
  } catch (err) {
    throw err;
  }
};

const loadLastEventSequenceId = () => {
  try {
    const data = fs.readFileSync(stateFile);
    return parseInt(data, 10);
  } catch (err) {
    return null;
  }
};

const analyzeEvent = (event) => {
  if (event.attributes.resourceType == 'review') {

    console.log('event', JSON.stringify(event));
    const {
      resourceId,
      resource,
      previousValues,
    } = event.attributes;
    const listing_id = resource.relationships.listing.data.id.uuid;
    const authorId = resource.relationships.author.data.id.uuid;
    const rating = resource.attributes.rating;

    const {state: previousState} = previousValues.attributes || {};

    console.log("update rating",listing_id)
    console.log("update rating",rating)
    updateRating(listing_id, rating);
  }
};

const updateRating = (listingId, rating) => {
  console.log("inside update rating")
  integrationSdk.listings.show({ id: listingId }).then(res => {
    console.log("this is show",res)
    let previous_review_count = res.data.data.attributes.metadata.noOfReviews??0;
    let previous_rating = res.data.data.attributes.metadata.rating??0;

    integrationSdk.listings.update({
      id:  listingId,
      metadata: {
        noOfReviews: previous_review_count + 1,
        rating: (previous_review_count * previous_rating + rating) / (previous_review_count + 1),
      },

    }, {
      expand: true,
    }).then(res2 => {
      console.log("this is second",res2)
      // res.data
    });
  });


};
const lastSequenceId = loadLastEventSequenceId();
const pollLoop = () => {

  const sequenceId = loadLastEventSequenceId();

  var params = sequenceId ? { startAfterSequenceId: sequenceId } : { createdAtStart: startTime };
  queryEvents(params)
    .then(res => {

      console.log('response', res.data);
      const events = res.data.data;
      const lastEvent = events[events.length - 1];
      const fullPage = events.length === res.data.meta.perPage;
      const delay = fullPage ? pollWait : pollIdleWait;
      const lastSequenceId = lastEvent ? lastEvent.attributes.sequenceId : sequenceId;

      events.forEach(e => {
        analyzeEvent(e);
      });

      if (lastEvent) saveLastEventSequenceId(lastEvent.attributes.sequenceId);

      setTimeout(() => {
        pollLoop(lastSequenceId);
      }, delay);
    });
};


console.log('Press <CTRL>+C to quit.');
if (lastSequenceId) {
  console.log(`Resuming event polling from last seen event with sequence ID ${lastSequenceId}`);
} else {
  console.log('No state found or failed to load state.');
  console.log('Starting event polling from current time.');
}
pollLoop();

