# Open ID Connect ID Provider for NJFF

This app implements openID connect, but intercepts the login process to handle a custom validation flow
for njff users.

## Transpiling
This project uses some modern es6 code for certain files, therefore you need to transpile es6 files.
Once you have cloned this project you need to do this:
- `npm i`
- `npm run watch` to have babel watch the files and transpile es6 to js files.

## Building
To build run `./gradlew build`

## Dynamics Integration
In order to communicate with the dynamics API we need to set a special config file in the enonic config folder.
Both xp-app-njff and this repo will share these config values. Read the docs in xp-app-njff for info regarding this file.


## Authentication
Authenticate your users using Open ID Connect.

This ID Provider application, acting as a OIDC Relying Party. will verify the identity of End-Users based on the authentication performed by your OIDC Authorization Server.
It will redirect unauthenticated users to the Authentication Server and obtain basic information in order to create a user within Enonic XP.
This ID Provider application follows the Authorization Code Flow and uses the Client/Secret POST token auth method.

## Dynamics validation and group synch
Once the openID implementation confirms a user is authenticated, it will check njffs dynamics API to check if the user
has been "validated" in their system. This also checks if the user even exists in NJFF database.

If the user does not exist in dynamics, the login is aborted.
If the user does exist, but is not validated we redirect the user to njff minside url that asks the user to input its membernumber and email/phone number.
If the user does exist, and the user has been previously validated, we extract the unions the user has "publishing" rights to and add the user to these groups that allready exist in the solution.

### How we are checking if a user has writing/publish access
When we receive the user object from dynamics using its "/account" endpoint, we also get an array of titles.
We iterate over each title and call the "/accounts" endpoint with different parameters to check if our user has writing access to the union.

All the unions in dynamics are synched in to our solution, once there is a change in the publishing rights, we will assing the user to the groups matching the write access.

### Common problems
During development the Columbus API proved to be extremely unreliable. If you experience issue with group-assignment, make sure the dynamics API returns the correct data.


