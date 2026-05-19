from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(80), nullable=True)
    avatar_url = db.Column(db.String(256), nullable=True)
    theme_preference = db.Column(db.String(20), default='dark')
    accent_color = db.Column(db.String(7), default='#00E5FF')  # Default electric teal accent
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    todos = db.relationship('Todo', backref='owner', lazy=True, cascade="all, delete-orphan")
    categories = db.relationship('Category', backref='user', lazy=True, cascade="all, delete-orphan")
    focus_sessions = db.relationship('FocusSession', backref='user', lazy=True, cascade="all, delete-orphan")
    activities = db.relationship('ActivityLog', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'display_name': self.display_name or self.email.split('@')[0].capitalize(),
            'avatar_url': self.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
            'theme_preference': self.theme_preference,
            'accent_color': self.accent_color,
            'date_created': self.date_created.strftime('%Y-%m-%d')
        }

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), default='#CCBEB1')  # Hex code for luxury colors
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relationship to Todos
    todos = db.relationship('Todo', backref='category_rel', lazy=True)

    def to_dict(self):
        total_tasks = len(self.todos)
        completed_tasks = len([t for t in self.todos if t.completed])
        progress_percentage = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'progress_percentage': progress_percentage
        }

class Todo(db.Model):
    __tablename__ = 'todos'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    column_state = db.Column(db.String(20), default='todo')  # todo, progress, review, done
    due_date = db.Column(db.DateTime, nullable=True)
    tags = db.Column(db.String(256), nullable=True)  # Comma-separated values
    
    # Category Relationship
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    
    # Subtasks mapping (self-referential relationship)
    parent_id = db.Column(db.Integer, db.ForeignKey('todos.id', ondelete='CASCADE'), nullable=True)
    subtasks = db.relationship('Todo', backref=db.backref('parent', remote_side=[id]), lazy=True, cascade="all, delete-orphan")

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description or '',
            'completed': self.completed,
            'priority': self.priority,
            'column_state': self.column_state,
            'due_date': self.due_date.strftime('%Y-%m-%d') if self.due_date else None,
            'tags': [t.strip() for t in self.tags.split(',')] if self.tags else [],
            'category_id': self.category_id,
            'category_name': self.category_rel.name if self.category_rel else 'General',
            'category_color': self.category_rel.color if self.category_rel else '#CCBEB1',
            'parent_id': self.parent_id,
            'subtasks': [sub.to_dict() for sub in self.subtasks],
            'date_created': self.date_created.strftime('%Y-%m-%d %H:%M:%S')
        }

class FocusSession(db.Model):
    __tablename__ = 'focus_sessions'
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    duration_seconds = db.Column(db.Integer, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'start_time': self.start_time.strftime('%Y-%m-%d %H:%M:%S'),
            'end_time': self.end_time.strftime('%Y-%m-%d %H:%M:%S') if self.end_time else None,
            'duration_seconds': self.duration_seconds
        }

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    action_type = db.Column(db.String(100), nullable=False)  # task_create, task_complete, focus_session, etc.
    details = db.Column(db.String(256), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'action_type': self.action_type,
            'details': self.details,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'time_relative': self.get_relative_time()
        }

    def get_relative_time(self):
        diff = datetime.utcnow() - self.timestamp
        seconds = diff.total_seconds()
        if seconds < 60:
            return "just now"
        minutes = seconds // 60
        if minutes < 60:
            return f"{int(minutes)}m ago"
        hours = minutes // 60
        if hours < 24:
            return f"{int(hours)}h ago"
        days = hours // 24
        return f"{int(days)}d ago"
