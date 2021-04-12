# Eleutherios

Eleutherios operates like a computer network, where servers subscribe to the network in order to make requests to other servers on the network.  Eleutherios does the same thing, except the server is a person or business, and the request is a forum, customer or conversation.

People or business are use to serving one another on a local level or one business, per forum or request.

```bash
Forum (bread x 3)
-- Service (Carpenter or customer)
-- Service (Baker or business)

Forum (10kg flour)
-- Service (Baker or customer)
-- Service (Flour miller or business)

Forum (1kg beef)
-- Service (Butcher or customer)
-- Service (Abattoir or business)
```

In this example, there is only one business managing each forum or request.  A baker is managing the carpenters request for bread.  A flour miller is managing the bakers request for flour and an abattoir is managing a butchers request for beef.

Eleutherios, changes this behavior, by inverting or scaling the forum or request, so that more than one business can manage it.

```bash
Forum (Food for family)
-- Service (Carpenter or customer)
-- Service (Baker or business)
-- Service (Butcher or business)
-- Forum (bread x 3)
---- Service (Carpenter or customer)
---- Service (Baker or business)
---- Forum (10kg flour)
------ Service (Baker or customer)
------ Service (Flour miller or business)
-- Forum (1kg beef)
---- Service (Butcher or customer)
---- Service (Abattoir or business)
```

Now, there are two businesses (baker, butcher) managing the carpenters request for food.  They can take the responsibility for managing the bread and beef, that the carpenter wants.  This type of request is circular or a network, and can be scaled indefinitely, inviting other services to serve as they are needed.

#### Features:

* Forum in forum (scalability)
* Tags for filtering forums or services (search)
* Blocking to prevent unwanted services or users from serving in forums, they have been asked not to serve in or for requesting services, they have been asked not to request (accountability)
* Service ratings/reviews (trust)
* Payments (resilience)
* Shared process or manifest (redundancy)
* AI (automation)

Eleutherios is built with a real-time pub/sub, node.js, nosql (Firestore) backend and an HTML/CSS (Angular) frontend.

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
  },
  googleTagManagerId: "xxxxxxxxxxxxx",
  stripeTestKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  url: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
};
```
```bash
iv.   firebase login
v.    firebase init
```

### 2. Login to firebase and deploy functions folder

Eleutherios uses functions to modify the behavior of the system and its data before or after it is created, updated or deleted in the system.  If you are planning on doing work on the backend API, then you should install firebase functions to help you test your work before committing it.

```bash
i.   cd functions
ii.  npm install
iii. firebase deploy --only functions
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

Help fix bugs or resolve issues.
https://github.com/aletheon/eleutherios-website/issues

Make a donation to the Eleutherios open source project.
https://opencollective.com/eleutherios
