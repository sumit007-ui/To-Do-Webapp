from flask import Blueprint, request, jsonify, g
from app.models import db, Todo, FocusSession, ActivityLog, Category
from app.routes.auth import jwt_required
from datetime import datetime, timedelta
from sqlalchemy import func

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/api/focus/start', methods=['POST'])
@jwt_required
def start_focus():
    user = g.user
    
    # Close any unclosed sessions just in case
    unclosed = FocusSession.query.filter_by(user_id=user.id, end_time=None).all()
    for s in unclosed:
        s.end_time = datetime.utcnow()
        s.duration_seconds = int((s.end_time - s.start_time).total_seconds())
    
    session = FocusSession(user_id=user.id)
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict())

@stats_bp.route('/api/focus/stop', methods=['POST'])
@jwt_required
def stop_focus():
    user = g.user
    session = FocusSession.query.filter_by(user_id=user.id, end_time=None).order_by(FocusSession.start_time.desc()).first()
    if not session:
        return jsonify({'error': 'No active focus session found'}), 400

    session.end_time = datetime.utcnow()
    session.duration_seconds = int((session.end_time - session.start_time).total_seconds())
    
    # Log session activity
    minutes = session.duration_seconds // 60
    if minutes > 0:
        log = ActivityLog(
            action_type='focus_session',
            details=f"Completed a focus session of {minutes} minute(s)",
            user_id=user.id
        )
        db.session.add(log)
        
    db.session.commit()
    return jsonify(session.to_dict())

@stats_bp.route('/api/stats/dashboard', methods=['GET'])
@jwt_required
def get_dashboard_stats():
    user = g.user
    
    # 1. Completion Ratio
    total_tasks = Todo.query.filter_by(user_id=user.id, parent_id=None).count()
    completed_tasks = Todo.query.filter_by(user_id=user.id, completed=True, parent_id=None).count()
    active_tasks = total_tasks - completed_tasks
    completion_rate = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    # 2. Today & Overdue tasks
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    today_tasks_count = Todo.query.filter(
        Todo.user_id == user.id,
        Todo.parent_id == None,
        Todo.due_date >= today_start,
        Todo.due_date < today_end
    ).count()
    
    overdue_tasks_count = Todo.query.filter(
        Todo.user_id == user.id,
        Todo.parent_id == None,
        Todo.due_date < today_start,
        Todo.completed == False
    ).count()

    # 3. Focus Session calculations
    focus_sum = db.session.query(func.sum(FocusSession.duration_seconds)).filter(FocusSession.user_id == user.id).scalar() or 0
    focus_minutes = int(focus_sum // 60)

    # 4. Weekly Streak Widget Calculation
    # Let's count consecutive active days of task completion or session starts
    today = datetime.utcnow().date()
    streak = 0
    check_day = today
    
    while True:
        day_start = datetime.combine(check_day, datetime.min.time())
        day_end = datetime.combine(check_day, datetime.max.time())
        
        # Check completed tasks or focus sessions on this day
        completed_on_day = Todo.query.filter(
            Todo.user_id == user.id,
            Todo.completed == True,
            Todo.due_date >= day_start,
            Todo.due_date <= day_end
        ).first()
        
        focused_on_day = FocusSession.query.filter(
            FocusSession.user_id == user.id,
            FocusSession.start_time >= day_start,
            FocusSession.start_time <= day_end
        ).first()
        
        if completed_on_day or focused_on_day:
            streak += 1
            check_day -= timedelta(days=1)
        else:
            # If nothing was done today, allow streak continuation if yesterday was active
            if check_day == today:
                check_day -= timedelta(days=1)
                continue
            break

    # 5. Weekly Distribution Data for Productivity Analytics Chart
    # Let's get the number of tasks completed per day for the last 7 days
    weekly_labels = []
    weekly_completed_data = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        count = Todo.query.filter(
            Todo.user_id == user.id,
            Todo.completed == True,
            Todo.due_date >= day_start,
            Todo.due_date <= day_end
        ).count()
        
        weekly_labels.append(day.strftime('%a'))
        weekly_completed_data.append(count)

    # 6. Priority distribution count
    priority_high = Todo.query.filter_by(user_id=user.id, priority='high', completed=False).count()
    priority_medium = Todo.query.filter_by(user_id=user.id, priority='medium', completed=False).count()
    priority_low = Todo.query.filter_by(user_id=user.id, priority='low', completed=False).count()

    return jsonify({
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'active_tasks': active_tasks,
        'completion_rate': completion_rate,
        'today_tasks_count': today_tasks_count,
        'overdue_tasks_count': overdue_tasks_count,
        'focus_minutes': focus_minutes,
        'streak': streak,
        'weekly_chart': {
            'labels': weekly_labels,
            'data': weekly_completed_data
        },
        'priority_stats': {
            'high': priority_high,
            'medium': priority_medium,
            'low': priority_low
        }
    })
