# Eleutherios

Eleutherios (https://eleutherios.org.nz) is a global cooperative forum or circular economy, that enables people or businesses to serve (give or recieve from) one another at scale, via the internet.

People or businesses, sign up with Eleutherios and add their product or service to the site. Other people or businesses (customers) search or get notified, whenever a new product or service is added and can order them, by creating a forum or chat with the person or business, providing it.

For example, if a person is hungry and isolated at home.  They could register with Eleutherios and create a forum, for some food. A grocery store owner, could register as a service and subscribe to the forum and ask the person, what food they wanted? The grocery store owner, could gather the food, from their store and scale the forum, by creating a sub-forum, for a healthcare worker to help with the delivery of the food. The healthcare worker, could scale the sub-forum again and create another sub-forum, for a delivery service and accompany the delivery service and be the person, that delivers the food to the person.

```bash
Forum (Food)
    Service (Person or customer)
    Service (Grocery store owner)
    Forum (Healthcare worker to delivery food)
        Service (Healthcare worker)
        Service (Grocery store owner)
        Forum (Pick up + drop off)
            Service (Healthcare worker)
            Service (Fastpost couriers)
```

In this example, Eleutherios is scaling or serializing the forum or conversation (<b>food/healthcare worker to deliver food/delivery service to deliver food</b>), that people or businesses are having.  Not the service or work, that they are trying to perform. People or businesses, still provide the same product or service in the world, but within the same forum or conversation.

#### Features:

* Forum in forum (redundancy/resilience).
* Tags for filtering forums or services (search).
* Alerts to keep end users informed, when new forums or services are created in the system (notifications).
* Blocking to prevent unwanted services or users, from serving in forums they have been asked not to serve in, or for requesting services they have been asked, not to request (accountability).
* Service ratings/reviews (accountability).
* B2B or shared manifest (scalability).
* AI (automation).

Eleutherios, is built with an HTML/javascript (Angular) frontend and node.js (nosql/firebase) backend.

# Installation and Setup

### 0. Prerequisites

```bash
i.    a new or existing firebase application with at least a google, facebook or email passwordless provider
ii.   node.js (https://nodejs.org/en/)
iii.  firebase cli (npm install -g firebase-tools)
iv.   angular cli (npm install -g @angular/cli)
```

### 1. Cloning Eleutherios

The easiest way to get Eleutherios up and running on your machine is to clone it.

```bash
i.    git clone https://github.com/aletheon/eleutherios-website.git eleutherios-website
```

```bash
iii.  copy the eleutherios-clone files to your my-eleutherios replacing any duplicate files such as README.md, .gitignore and package.json.
iv.   run npm install to install dependencies
v.    create a new folder in your src folder called environments to hold your firebase database configuration files environment.prod.ts and environment.ts:

export const environment = {
  production: true | false,
  firebase: {
    apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    databaseURL: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    projectId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    storageBucket: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    messagingSenderId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    appId: "xxxxxxxxxxxxx",
    measurementId: "xxxxxxxxxxxxx"
  },
  application_fee: 9.99,
  stripe: "xxxxxxxxxxxxx",
  googleTagManagerId: "xxxxxxxxxxxxx"
};

```

### 2. Login to firebase and deploy functions folder

Eleutherios uses functions to modify the behavior of the system and its data before or after it is created, updated or deleted in the system.  It's important that functions are enabled in your firebase project.

```bash
i.    firebase login
ii.   firebase init
        a. setup functions
iii.  firebase deploy --only functions
```

If you want to modify the behavior of the functions then you can test it on your firebase server first, before you check it into the master.

### 3. Setup firebase

It's important to setup your firebase backend to work with the source code.

```bash
i.    enable firebase authentication (email/password, google, facebook)
ii.   create a totals table in firebase not firestore, with the following default structure:
        totals
          forum
            count: 0
          service
            count: 0
          user
            count: 0
```

### 4. Run Eleutherios

Once you have setup Eleutherios you can run it on your local server.

If you have any difficulties setting Eleutherios up then please contact me so I can help you.

```bash
i.    ng serve
ii.   go to http://localhost:4200/
```

### 5. Contribute

Discuss or provide feedback.
https://www.facebook.com/groups/2982366048442234/

Help fix bugs or resolve issues.
https://github.com/aletheon/eleutherios-alpha/issues

Make a donation to the Eleutherios open source project.
https://opencollective.com/eleutherios