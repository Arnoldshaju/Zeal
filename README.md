# Zeal

Zeal is an unfinished full-stack collaborative document editor. It allows users to create, edit, and share documents while receiving real-time updates through WebSockets.

> This project is under active development. Some features may be incomplete or change in future releases.

## Features

- User registration and login
- JWT-based authentication
- Automatic access-token renewal
- Create, view, edit, and delete documents
- Rich-text editing with Tiptap
- Real-time document updates
- Live collaborator presence
- Role-based document sharing
- Owner, editor, and viewer permissions
- Read-only access for viewers
- Responsive web interface
- Django administration panel
- Automated backend tests

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Tiptap rich-text editor

### Backend

- Python
- Django
- Django REST Framework
- Django Channels
- Simple JWT
- Daphne ASGI server

### Database and Infrastructure

- SQLite for local development
- PostgreSQL configuration through Docker Compose
- In-memory Channels layer for local WebSocket communication

## Project Structure

```text
Zeal/
├── apps/
│   └── web/                 # Next.js frontend
│       ├── public/
│       └── src/
│           ├── app/         # Pages and routes
│           ├── components/  # React components
│           └── lib/         # API and collaboration clients
├── backend/
│   ├── collaboration/       # WebSocket consumers and tests
│   ├── config/              # Django configuration
│   ├── documents/           # Document models and API
│   ├── users/               # Authentication and users
│   ├── manage.py
│   └── requirements.txt
├── legacy/                  # Preserved earlier frontend
├── docker-compose.yml
└── README.md
