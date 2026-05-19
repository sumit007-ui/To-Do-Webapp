from flask import Blueprint, request, jsonify, g
from app.models import db, Todo, Category, ActivityLog
from app.routes.auth import jwt_required
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/api/todos', methods=['GET'])
@jwt_required
def get_todos():
    user = g.user
    todos = Todo.query.filter_by(user_id=user.id, parent_id=None).order_by(Todo.date_created.desc()).all()
    return jsonify([todo.to_dict() for todo in todos])

@tasks_bp.route('/api/todos', methods=['POST'])
@jwt_required
def create_todo():
    user = g.user
    data = request.get_json() or {}
    title = data.get('title')
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
        except ValueError:
            due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))

    new_todo = Todo(
        title=title,
        description=data.get('description'),
        priority=data.get('priority', 'medium'),
        column_state=data.get('column_state', 'todo'),
        due_date=due_date,
        tags=data.get('tags'),  # Comma-separated
        category_id=data.get('category_id'),
        parent_id=data.get('parent_id'),
        user_id=user.id
    )
    db.session.add(new_todo)
    db.session.commit()

    # Log action
    log = ActivityLog(
        action_type='task_create',
        details=f"Created task: \"{title}\"",
        user_id=user.id
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(new_todo.to_dict())

@tasks_bp.route('/api/todos/<int:todo_id>', methods=['PUT'])
@jwt_required
def update_todo(todo_id):
    user = g.user
    todo = Todo.query.filter_by(id=todo_id, user_id=user.id).first()
    if not todo:
        return jsonify({'error': 'Task not found'}), 404

    data = request.get_json() or {}
    
    # Check if completion state is changing for logging
    if 'completed' in data and data['completed'] != todo.completed:
        todo.completed = data['completed']
        todo.column_state = 'done' if todo.completed else 'todo'
        action = 'task_complete' if todo.completed else 'task_reopened'
        details = f"Completed task: \"{todo.title}\"" if todo.completed else f"Reopened task: \"{todo.title}\""
        log = ActivityLog(action_type=action, details=details, user_id=user.id)
        db.session.add(log)

    if 'title' in data:
        todo.title = data['title']
    if 'description' in data:
        todo.description = data['description']
    if 'priority' in data:
        todo.priority = data['priority']
    if 'column_state' in data:
        old_state = todo.column_state
        todo.column_state = data['column_state']
        if todo.column_state == 'done':
            todo.completed = True
        else:
            todo.completed = False
        
        if old_state != todo.column_state:
            log = ActivityLog(
                action_type='task_move',
                details=f"Moved \"{todo.title}\" to {todo.column_state.upper()}",
                user_id=user.id
            )
            db.session.add(log)

    if 'due_date' in data:
        if data['due_date']:
            try:
                todo.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
            except ValueError:
                todo.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        else:
            todo.due_date = None

    if 'tags' in data:
        todo.tags = data['tags']
    if 'category_id' in data:
        todo.category_id = data['category_id']

    db.session.commit()
    return jsonify(todo.to_dict())

@tasks_bp.route('/api/todos/<int:todo_id>', methods=['DELETE'])
@jwt_required
def delete_todo(todo_id):
    user = g.user
    todo = Todo.query.filter_by(id=todo_id, user_id=user.id).first()
    if not todo:
        return jsonify({'error': 'Task not found'}), 404

    db.session.delete(todo)
    db.session.commit()

    # Log action
    log = ActivityLog(
        action_type='task_delete',
        details=f"Deleted task: \"{todo.title}\"",
        user_id=user.id
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Task deleted successfully'})

# Categories
@tasks_bp.route('/api/categories', methods=['GET', 'POST'])
@jwt_required
def handle_categories():
    user = g.user
    if request.method == 'GET':
        categories = Category.query.filter_by(user_id=user.id).all()
        return jsonify([cat.to_dict() for cat in categories])

    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Category name is required'}), 400

    new_cat = Category(
        name=name,
        color=data.get('color', '#CCBEB1'),
        user_id=user.id
    )
    db.session.add(new_cat)
    db.session.commit()

    return jsonify(new_cat.to_dict())

@tasks_bp.route('/api/categories/<int:cat_id>', methods=['DELETE'])
@jwt_required
def delete_category(cat_id):
    user = g.user
    cat = Category.query.filter_by(id=cat_id, user_id=user.id).first()
    if not cat:
        return jsonify({'error': 'Category not found'}), 404

    # Remove category reference in todos
    todos = Todo.query.filter_by(category_id=cat.id).all()
    for t in todos:
        t.category_id = None

    db.session.delete(cat)
    db.session.commit()
    return jsonify({'message': 'Category deleted successfully'})

# Activity Logs
@tasks_bp.route('/api/activities', methods=['GET'])
@jwt_required
def get_activities():
    user = g.user
    logs = ActivityLog.query.filter_by(user_id=user.id).order_by(ActivityLog.timestamp.desc()).limit(15).all()
    return jsonify([log.to_dict() for log in logs])
