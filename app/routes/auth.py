import jwt
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, make_response, g, current_app
from functools import wraps
from datetime import datetime, timedelta
from app.models import db, User, Category

auth_bp = Blueprint('auth', __name__)

def generate_token(user_id):
    payload = {
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
        'sub': user_id
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        # Fallback to cookies
        if not token:
            token = request.cookies.get('access_token')

        if not token:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Authentication token is missing'}), 401
            return redirect(url_for('auth.login_page'))

        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            g.user = db.session.get(User, payload['sub'])
            if not g.user:
                raise jwt.InvalidTokenError
        except jwt.ExpiredSignatureError:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Token has expired'}), 401
            return redirect(url_for('auth.login_page'))
        except jwt.InvalidTokenError:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Invalid token'}), 401
            return redirect(url_for('auth.login_page'))

        return f(*args, **kwargs)
    return decorated

# Page Routes
@auth_bp.route('/login', methods=['GET'])
def login_page():
    # If already logged in, redirect to index
    token = request.cookies.get('access_token')
    if token:
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            user = db.session.get(User, payload['sub'])
            if user:
                return redirect('/')
        except Exception:
            pass
    return render_template('login.html')

@auth_bp.route('/register', methods=['GET'])
def register_page():
    return render_template('register.html')

@auth_bp.route('/logout', methods=['GET'])
def logout():
    response = make_response(redirect(url_for('auth.login_page')))
    response.set_cookie('access_token', '', expires=0)
    return response

# API Routes
@auth_bp.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    display_name = data.get('display_name')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email is already registered'}), 400

    user = User(email=email, display_name=display_name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Create default categories for user
    default_categories = [
        ('Personal', '#00E5FF'),
        ('Work', '#E5C158'),
        ('Urgent', '#FF6B6B'),
        ('General', '#8C8BA0')
    ]
    for name, color in default_categories:
        cat = Category(name=name, color=color, user_id=user.id)
        db.session.add(cat)
    db.session.commit()

    token = generate_token(user.id)
    response = make_response(jsonify({'success': True, 'user': user.to_dict(), 'token': token}))
    response.set_cookie('access_token', token, httponly=True, max_age=604800, samesite='Lax')
    return response

@auth_bp.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token(user.id)
    response = make_response(jsonify({'success': True, 'user': user.to_dict(), 'token': token}))
    response.set_cookie('access_token', token, httponly=True, max_age=604800, samesite='Lax')
    return response

@auth_bp.route('/api/auth/profile', methods=['GET', 'PUT'])
@jwt_required
def api_profile():
    user = g.user
    if request.method == 'GET':
        return jsonify(user.to_dict())
    
    data = request.get_json() or {}
    if 'display_name' in data:
        user.display_name = data['display_name']
    if 'theme_preference' in data:
        user.theme_preference = data['theme_preference']
    if 'accent_color' in data:
        user.accent_color = data['accent_color']
    
    db.session.commit()
    return jsonify(user.to_dict())
