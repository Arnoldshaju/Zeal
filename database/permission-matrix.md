# Zeal permission matrix

## Authentication endpoints

| Action | Anonymous | Authenticated |
| --- | ---: | ---: |
| Register | Yes | Yes |
| Login | Yes | Yes |
| Refresh access token | Yes, with a valid refresh token | Yes |
| Request email verification | Yes | Yes |
| Confirm email verification | Yes, with a valid signed link | Yes |
| Request password reset | Yes | Yes |
| Confirm password reset | Yes, with a valid signed link | Yes |
| Read current user | No | Yes |
| Logout and revoke refresh token | No | Yes |

## Workspace permissions

| Action | Owner | Admin | Member | Stranger |
| --- | ---: | ---: | ---: | ---: |
| View workspace | Yes | Yes | Yes | No |
| View workspace documents | Yes | Yes | Yes | No |
| Create a document | Yes | Yes | Yes | No |
| Rename workspace | Yes | Yes | No | No |
| Add regular member | Yes | Yes | No | No |
| Appoint admin | Yes | No | No | No |
| Change regular member role | Yes | Yes | No | No |
| Manage another admin | Yes | No | No | No |
| Delete non-personal workspace | Yes | No | No | No |
| Delete personal workspace | No | No | No | No |

## Document permissions

| Action | Document owner | Workspace owner/admin | Workspace member | Document editor | Document viewer | Stranger |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| View document | Yes | Yes | Yes | Yes | Yes | No |
| Edit document | Yes | Yes | No | Yes | No | No |
| Delete document | Yes | Yes | No | Yes | No | No |
| Read comments | Yes | Yes | Yes | Yes | Yes | No |
| Create comment | Yes | Yes | No | Yes | No | No |
| Resolve comment | Yes | No | No | No | No | No |
| Delete comment | Yes | No | No | No | No | No |

These rules must be enforced by backend permission checks. Hiding a frontend
button is useful feedback but is not security enforcement.
