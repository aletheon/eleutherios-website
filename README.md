# Eleutherios

Eleutherios (https://eleutherios.org.nz) is a platform that enables people or businesses to give or receive, service or energy from one another in real-time, via the internet.

For example, if a person is hungry and quarantined at home? They could register with Eleutherios and create a forum, for some food. A grocery store owner, could register as a service and subscribe to the forum and ask the person, what food they wanted? After listening to their request, the grocery store owner, could gather the food from their store and scale the forum, by creating a sub-forum for a delivery service to delivery the food. The delivery service, could scale the sub-forum again and create another sub-forum, for a healthcare worker to be the person, that delivers the food to the person.

```bash
Forum (Food)
---- Service (Person or customer)
---- Service (Grocery store owner)
---- Forum (Pick up + drop off)
-------- Service (Grocery store owner or customer)
-------- Service (Fastpost couriers)
-------- Forum (Healthcare worker to deliver food)
------------ Service (Fastpost couriers or customer)
------------ Service (Healthcare worker)
```

In this example, Eleutherios is scaling or serializing the forum or conversation (Food/Pick up + drop off/Healthcare worker to deliver food), that people or businesses are having.  Not the service or work, that they are trying to provide or perform.  People or businesses, still provide the same product or service in the world, but within the same forum or conversation.

#### Features:

* Forum in forum (scalability)
* Tags for filtering forums or services (search)
* Alerts to keep end users informed when new forums or services are created in the system (notifications)
* Blocking to prevent unwanted services or users from serving in forums, they have been asked not to serve in or for requesting services, they have been asked not to request (accountability)
* Service ratings/reviews (trust)
* Payments (resilience)
* Shared process or manifest (B2B/redundancy)
* AI (automation)

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

The easiest way to get Eleutherios up and running is to clone it to your machine.

```bash
i.    git clone https://github.com/aletheon/eleutherios-website.git eleutherios-website
ii.   run npm install to install dependencies
iii.  create a new folder in your src folder called environments to hold your environment (environment.prod.ts and environment.ts) variables:
```

```bash
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
  }
};
```

### 2. Login to firebase and deploy functions folder

Eleutherios uses functions to modify the behavior of the system and its data before or after it is created, updated or deleted in the system.  If you are planning on doing work on the backend API, then you should install firebase functions to help you test your work before committing it.

```bash
i.   cd functions
ii.  npm install
iii. firebase login
iv.  firebase deploy --only functions
```

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
https://github.com/aletheon/eleutherios-website/issues

Make a donation to the Eleutherios open source project.
https://opencollective.com/eleutherios