# JWT token revocation strategy

## Token lifetimes

- Access token: 15 minutes
- Refresh token: 7 days
- Refresh tokens rotate whenever they are used
- The previous refresh token is blacklisted after rotation

## Logout

The client sends its refresh token to `POST /api/auth/logout/`. Django stores
that token in Simple JWT's blacklist and the client removes both tokens from
local storage.

An already issued access token is stateless and remains usable until its short
15-minute expiration. Immediate access-token revocation would require checking
a server-side denylist on every request or using opaque server-side sessions.
Zeal chooses short-lived access tokens plus refresh-token revocation.

## Password reset

Changing a password invalidates Django password-reset links after use. Existing
refresh tokens should also be revoked in a future enhancement by blacklisting
all outstanding refresh tokens belonging to the user.

## Account compromise

An administrator should be able to blacklist all outstanding refresh tokens for
a user and deactivate the account. Protected endpoints already reject inactive
users during normal authentication.

## Storage guidance

The browser currently stores tokens in local storage. This is convenient for
development but exposes tokens to successful XSS attacks. A production design
should consider secure, `HttpOnly`, `SameSite` cookies, CSRF protection, a
strict Content Security Policy, and refresh-token reuse detection.
