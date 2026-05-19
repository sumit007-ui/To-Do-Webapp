import os
from flask import Flask, render_template, redirect, url_for, request, jsonify
from config import Config
from app.models import db, User, Category
from app.routes import register_blueprints
from app.routes.auth import jwt_required, jwt

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    register_blueprints(app)

    # Database automatic tables creation
    with app.app_context():
        db.create_all()

    # Root route for SPA
    @app.route('/')
    @jwt_required
    def index():
        return render_template('base.html')

    # Fallback to catch all routes and route them to index.html (SPA style)
    @app.errorhandler(404)
    def page_not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not Found'}), 404
        # Redirect pages back to SPA
        return redirect(url_for('index'))

    return app
