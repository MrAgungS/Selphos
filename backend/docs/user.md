# User API Spec

## Register User
**Endpoint :** POST /api/users/register

**Request Body :** 
```json
{
  "email" : ".....",
  "Password" : ".....",
  "name" : ".....",
}
```

**Request Body Success:** 
```json
{
  "data" : {
    "email" : ".....",
    "name" : ".....",
  }
}
```

**Request Body Failed:** 
```json
{
  "statusCode": 409,
  "errors" : "Email already registered"
}
```

---

## Login User
**Endpoint :** POST /api/users/login

**Request Body:**
```json
{
  "email" : ".....",
  "Password" : ".....",
}
```

**Request Body Success:** 
```json
{
  "data" : {
    "email" : ".....",
    "name" : ".....",
    "access_token" : "...."
    "refresh_token" : "...."
  }
}
```

**Request Body Failed:** 
```json
{
  "statusCode": 401,
  "errors" : "Email or Password is wrong"
}
```

---

## Refresh User
**Endpoint :** POST /api/users/refresh

**Headers:**
```
- authorization: access_token
```

Request Body: 
```json
{
  "refresh_token": "...."
}
```

**Request Body Success:** 
```json
{
  "data" : {
    "access_token" : "...."
    "refresh_token" : "...."
  }
}
```

**Request Body Failed:** 
```json
{
  "statusCode": 401,
  "errors" : "Refresh token is invalid or expired"
}
```
```json
{
  "statusCode": 403,
  "errors": "Refresh token is invalid"
}
```

---

## LogOut User
**Endpoint :** POST /api/users/logout

**Headers:**
```
- authorization: access_token
```

**Request Body:** 
```json
{
  "user": "...."
}
```

**Request Body Success:** 
```json
{
  "data" : true
}
```

**Request Body Failed:** 
```json
{
  "statusCode": 401,
  "errors" : "Access token invalid"
}
```
