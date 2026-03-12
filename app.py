from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from datetime import datetime
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    todos = db.relationship('Todo', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='medium') # low, medium, high
    due_date = db.Column(db.DateTime, nullable=True)
    category = db.Column(db.String(50), default='General')
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'completed': self.completed,
            'priority': self.priority,
            'due_date': self.due_date.strftime('%Y-%m-%d') if self.due_date else None,
            'category': self.category,
            'date_created': self.date_created.strftime('%Y-%m-%d %H:%M:%S')
        }

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    if current_user.is_authenticated:
        return render_template('index.html')
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        flash('Invalid email or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        if User.query.filter_by(email=email).first():
            flash('Email already registered')
            return redirect(url_for('register'))
        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user) # Auto login after registration
        flash('Registration successful!')
        return redirect(url_for('index')) # Redirect to home page
    return render_template('register.html')



@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/todos', methods=['GET'])
@login_required
def get_todos():
    todos = Todo.query.filter_by(user_id=current_user.id).order_by(Todo.date_created.desc()).all()
    return jsonify([todo.to_dict() for todo in todos])

@app.route('/api/todos', methods=['POST'])
@login_required
def add_todo():
    data = request.get_json()
    due_date = None
    if data.get('due_date'):
        due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
    
    new_todo = Todo(
        title=data['title'],
        priority=data.get('priority', 'medium'),
        category=data.get('category', 'General'),
        due_date=due_date,
        user_id=current_user.id
    )
    db.session.add(new_todo)
    db.session.commit()
    return jsonify(new_todo.to_dict())

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
@login_required
def update_todo(todo_id):
    todo = db.session.get(Todo, todo_id)
    if not todo or todo.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    if 'title' in data:
        todo.title = data['title']
    if 'completed' in data:
        todo.completed = data['completed']
    if 'priority' in data:
        todo.priority = data['priority']
    if 'category' in data:
        todo.category = data['category']
    if 'due_date' in data:
        todo.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d') if data['due_date'] else None
    
    db.session.commit()
    return jsonify(todo.to_dict())

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
@login_required
def delete_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    if todo.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(todo)
    db.session.commit()
    return jsonify({'message': 'Todo deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True) 