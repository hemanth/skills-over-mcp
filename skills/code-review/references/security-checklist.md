# Security Checklist

OWASP-aligned checklist for code reviews. Walk through each category and
verify the changes don't introduce vulnerabilities.

## Authentication & Credentials

- [ ] No hardcoded secrets, API keys, or passwords in source code.
- [ ] Secrets are loaded from environment variables or a secrets manager.
- [ ] Authentication tokens have appropriate expiry times.
- [ ] Password hashing uses bcrypt, scrypt, or Argon2 (never MD5/SHA1).

## Input Validation

- [ ] All user input is validated and sanitised on the server side.
- [ ] SQL queries use parameterised statements (no string concatenation).
- [ ] HTML output is escaped to prevent XSS.
- [ ] File uploads are validated for type, size, and content.
- [ ] URL parameters and headers are validated before use.

## Authorization

- [ ] Authorization checks are performed before every sensitive action.
- [ ] Role-based access control (RBAC) is enforced consistently.
- [ ] API endpoints enforce the principle of least privilege.
- [ ] Direct object references are validated against the current user.

## Data Protection

- [ ] Sensitive data is encrypted at rest and in transit.
- [ ] PII is not logged or is redacted in log output.
- [ ] CORS headers are configured to allow only trusted origins.
- [ ] Content Security Policy (CSP) headers are present and restrictive.

## Dependencies

- [ ] New dependencies are reviewed for known vulnerabilities.
- [ ] Dependencies are pinned to specific versions (no floating ranges).
- [ ] No unnecessary dependencies are introduced.
- [ ] Licence compatibility is verified for new packages.

## Error Handling

- [ ] Errors do not expose stack traces or internal details to users.
- [ ] All exceptions are caught and logged with sufficient context.
- [ ] Retry logic has maximum bounds to prevent infinite loops.
