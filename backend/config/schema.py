def clarify_jwt_authorization(result, generator, request, public):
    """Make Swagger's JWT input instructions explicit.

    Swagger UI adds the ``Bearer`` prefix for HTTP bearer schemes. Users only
    need to paste the access-token value returned by the login endpoint.
    """

    security_schemes = result.setdefault("components", {}).setdefault(
        "securitySchemes",
        {},
    )
    jwt_scheme = security_schemes.get("jwtAuth")
    if jwt_scheme is not None:
        jwt_scheme["description"] = (
            "Paste only the JWT access-token value returned by "
            "POST /api/auth/login/. Do not type the word 'Bearer'; "
            "Swagger adds it automatically."
        )
    return result
