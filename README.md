# Eleutherios

Eleutherios (https://eleutherios.org.nz) is a global cooperative forum or sociopolitical or economic system, that enables humankind to self-organize with one another at scale, via the internet.

![futureOverview](./src/assets/futureOverview.jpg)

It does this by scaling the request layer (customer) over the service layer (business) to enable more than one service provider to be able to participate in the same request or network at the same time.

![currentOverview](./src/assets/currentOverview.jpg)

Our current human sociopolitical or economic system does the opposite and doesn’t scale the request layer. Only one service provider can participate in the request or network at the same time.

There are many problems that manifest from this type of behavior, such as a competitive service layer, an inherent cost to acquire customers and the inability to share data or policies.

Eleutherios changes this behavior by turning the service layer into a cooperative network and reducing the cost for service providers to acquire customers, and enabling them to share data and policies with one another.

![subforum](./src/assets/subforum.jpg)

End users can create a forum or request, that can be scaled indefinitely, enabling more than one service provider to be able to participate in the same forum or request.

![breadcrumb](./src/assets/breadcrumb.jpg)

End users can navigate their way around the conversation through a virtual breadcrumb.

![priskaService](./src/assets/priskaService.jpg)

The current version of Eleutherios provides basic business tools such as creating a forum, scaling a forum, creating a service, searching for forums or services, and purchasing services. Over-time Eleutherios will evolve into a PAAS or cloud environment, enabling service providers to operate their business, through our platform.

#### Current features:

- Tags for filtering forums or services
- Forum in forum
- Blocking to prevent unwanted services or users from serving in forums, they have been asked not to serve in or for requesting services, they have been asked not to request
- Service ratings/reviews
- B2B Payments

Eleutherios is built with Node.js, Firestore and Angular.

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

Eleutherios uses functions to modify the behavior of the system and its data before or after it is created, updated or deleted in the system. If you are planning on doing work on the backend API, then you should install firebase functions to help you test your work before committing it.

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

Make a donation to the Eleutherios open source project. https://opencollective.com/eleutherios
