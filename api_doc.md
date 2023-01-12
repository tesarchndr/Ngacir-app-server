# NGACIR API Documentation

## Endpoints:

### List of endpoints
- `POST /users/register`
- `POST /users/login`
- `POST /users/googleLogin`
- `PUT /users/forgotpassword`
- `PUT /users/resetpassword`
- `GET /products`
- `POST /trx`
- `POST /trx/email`
- `GET /histories/`
- `POST /histories/`
- `POST /histories/week`
- `POST /histories/week/:date`

## 1. POST /login
- ### REQUEST
- #### body
```json
{
    "email": "email",
    "password": "string"
}
```
_Response (200 - OK)_
```json
{
    "access_token": "string"
}
```
_Response (400 - Bad Request)_
```json
{
    "message": "error email or password required"
}
```
_Response (401 - invalidemailorpassword)_
```json
{
    "message": "error invalid username or email or password"
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 2. POST /register
- ### REQUEST
- #### body
```json
{
    "noHp": "string",
    "email": "email",
    "password": "string"
}
```
_Response (201 - created)_
```json
{   
    "id": "integer",
    "email": "string"
}
```
_Response (400 - Bad Request)_
```json
{
    "message": "email is required."
}
OR
{
    "message": "email invalid."
}
OR
{
    "message": "email has been used."
}
OR
{
    "message": "password is required."
}
OR
{
    "message": "minimal password is 5."
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 3. POST /googleLogin
- ### REQUEST
- #### body
```json
{
    "email": "email",
    "password": "string"
}
```
_Response (201 - created)_
```json
{   
    "access_token": "string",
    "email": "string",
    "role": "string"
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 4. POST /forgotpassword
- ### REQUEST
- #### body
```json
{
    "email": "email",
}

```
_Response (200 - OK)_
```json
{   
    "message": "Succes send Email",
}
```
_Response (404 - Not Found)_
```json
{
    "message": "not found"
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 5. POST /resetpassword
- ### REQUEST
- #### body
```json
{
    "password": "string",
    "token": "string"
}
```
_Response (404 - Not Found)_
```json
{
    "message": "not found"
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 6. GET /products
- ### REQUEST
- #### headers
```json
{
    "access_token" : "string"
}
```
- #### query
```json
{
    "type": "string"
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 7. POST /trx
- ### REQUEST
- #### headers
```json
{
    "access_token" : "string"
}
```
- #### body
```json
{
    "data": "object"
}
```
_Response (400 - Bad Request)_
```json
{
    "message": "Choose One"
}
```
OR
```json
{
    "message": "Name is required"
}
```
_Response (200 - OK)_
```json
{   
    "message": "Success create Transaction",
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 8. POST /trx
- ### REQUEST
- #### headers
```json
{
    "access_token" : "string"
}
```
- #### body
```json
{
    "dataTrx": "object"
    "customerName": "string"
    "totalPrice": "string"
    "email": "string"
}
```
_Response (400 - Bad Request)_
```json
{
    "message": "Choose One"
}
```
OR
```json
{
    "message": "Name is required"
}
```
_Response (200 - OK)_
```json
{   
    "message": "Invoice has been send",
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 9. GET /histories
- ### REQUEST
- #### headers
```json
{
    "access_token" : "string"
}
```
_Response (200 - OK)_
```json
{   
    [
        {"data" : "data"},
        {"data" : "data"}
    ]
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## 10. POST /histories
- ### REQUEST
- #### headers
```json
{
    "access_token" : "string"
}
```
- #### body
```json
{
    "customerName": "string"
    "price": "string"
}
```
_Response (201  - Created)_
```json
{   
    "message": "Create History"
}
```

_Response (500 - Internal Server Error)_

&nbsp;

## 10. POST /histories
- ### REQUEST
- #### headers
```json
{
    "access_token" : "string"
}
```
_Response (200 - OK)_
```json
{   
    [
        {"data" : "data"},
        {"data" : "data"}
    ]
}
```
_Response (500 - Internal Server Error)_

&nbsp;

## Global Error
_Response (401 - Unauthorized)_
```json
{
    "message": "'Unauthorized'"
}
```

_Response (500 - Internal Server Error)_

```json
{
    "message": "Internal Server Error"
}
```








