from app.routes.auth import auth_bp
from app.routes.tasks import tasks_bp
from app.routes.stats import stats_bp
from app.routes.ai import ai_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(ai_bp)
