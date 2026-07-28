# Transaction boundaries

## Document creation

Creating the document and its `OWNER` membership is atomic. A failure in either
insert rolls both back.

## Document revision

Creating the historical revision and updating the current document occur in one
transaction through `update_document_with_revision`.

## Workspace creation

Creating a workspace and its owner membership should occur in one transaction
when the workspace API is added.

## Invitation acceptance

Token validation happens before mutation. Creating/updating membership and
marking the invitation accepted must commit together. Remote email delivery does
not belong inside this database transaction.

## Role changes

The membership update and corresponding audit-log insert should be atomic so
the audit history always agrees with the effective permission.
