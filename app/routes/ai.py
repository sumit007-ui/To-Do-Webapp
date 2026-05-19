from flask import Blueprint, request, jsonify, g
from app.models import db, Todo, Category, FocusSession
from app.routes.auth import jwt_required
import random

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/api/ai/insights', methods=['GET'])
@jwt_required
def get_ai_insights():
    user = g.user
    
    # Let's count some stats to make insights relevant
    total_tasks = Todo.query.filter_by(user_id=user.id, completed=False).count()
    high_priority = Todo.query.filter_by(user_id=user.id, priority='high', completed=False).count()
    completed_today = Todo.query.filter_by(user_id=user.id, completed=True).count()
    
    focus_sum = db.session.query(db.func.sum(FocusSession.duration_seconds)).filter(FocusSession.user_id == user.id).scalar() or 0
    focus_minutes = int(focus_sum // 60)

    insights = []

    # Dynamic Insight 1: Productivity Score
    if total_tasks == 0:
        insights.append({
            'title': 'Pristine Horizon',
            'description': 'Your space is perfectly clear. Use this calm period to conceptualize major goals or start an ambient focus session.',
            'type': 'success',
            'metric': '100% Clear'
        })
    elif high_priority > 2:
        insights.append({
            'title': 'High Velocity Required',
            'description': f'You have {high_priority} High-Priority tasks pending. We recommend triggering a 25-minute Pomodoro focus block to tackle "{Todo.query.filter_by(user_id=user.id, priority="high", completed=False).first().title}" first.',
            'type': 'warning',
            'metric': f'{high_priority} Critical Tasks'
        })
    else:
        insights.append({
            'title': 'Optimal Focus Wave',
            'description': 'Your workspace ratio looks excellent. Velocity is consistent, and cognitive load is well distributed.',
            'type': 'info',
            'metric': 'Balanced Pace'
        })

    # Dynamic Insight 2: Chrono-Velocity & Focus Timing
    if focus_minutes > 45:
        insights.append({
            'title': 'Deep Flow State Unlocked',
            'description': f'You have accumulated {focus_minutes} focus minutes this week. Research shows your optimal work window is in the morning. Keep it up!',
            'type': 'success',
            'metric': f'{focus_minutes} Focus Mins'
        })
    else:
        insights.append({
            'title': 'Ambient Deep Work Option',
            'description': 'Consider launching a quiet Focus Block today. Studies show a single 20-minute uninterrupted window boosts overall output by 35%.',
            'type': 'neutral',
            'metric': 'Flow Trigger'
        })

    # Dynamic Insight 3: Balanced Life prediction
    cats = Category.query.filter_by(user_id=user.id).all()
    if cats:
        # Check category task distribution
        cat_stats = []
        for c in cats:
            count = Todo.query.filter_by(category_id=c.id, completed=False).count()
            cat_stats.append((c.name, count))
        
        # Find highest and lowest active categories
        cat_stats.sort(key=lambda x: x[1])
        if cat_stats[-1][1] > 0:
            insights.append({
                'title': 'Workspace Alignment Tip',
                'description': f'Most of your actions focus on "{cat_stats[-1][0]}". Consider allocating a minor 10-minute block for "{cat_stats[0][0]}" to maintain optimal life-balance metrics.',
                'type': 'info',
                'metric': 'Category Drift'
            })
    
    # Fallback to general aesthetic insights if list is short
    if len(insights) < 3:
        lux_tips = [
            {
                'title': 'Aesthetic Order',
                'description': 'Tidy desks correspond to tidy thoughts. Arrange your physical workspace to reflect the clean glass layouts of your digital hub.',
                'type': 'neutral',
                'metric': 'Mindfulness'
            },
            {
                'title': 'The Power of Done',
                'description': 'A completed task releases dopamine. Tackle your easiest low-priority items first to build momentum.',
                'type': 'info',
                'metric': 'Momentum Shift'
            }
        ]
        insights.append(random.choice(lux_tips))

    return jsonify(insights)

@ai_bp.route('/api/ai/categorize', methods=['POST'])
@jwt_required
def auto_categorize():
    user = g.user
    data = request.get_json() or {}
    title = data.get('title', '').lower()

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    categories = Category.query.filter_by(user_id=user.id).all()
    if not categories:
        return jsonify({'category_id': None, 'name': 'General'})

    # Classify based on keyword keywords
    predicted_category = None
    
    keywords = {
        'work': ['meeting', 'project', 'design', 'code', 'presentation', 'email', 'marketing', 'report', 'client', 'server', 'deploy', 'office', 'schedule', 'write', 'job'],
        'personal': ['buy', 'groceries', 'gift', 'clean', 'laundry', 'shop', 'movie', 'book', 'house', 'family', 'call', 'dentist', 'vet', 'dinner', 'gym', 'workout', 'run'],
        'urgent': ['urgent', 'critical', 'important', 'asap', 'fast', 'today', 'deadline', 'soon', 'alert', 'priority', 'fix', 'bug'],
        'general': ['misc', 'general', 'other', 'stuff', 'note', 'idea']
    }

    # Match title words
    matched_cat_name = None
    for cat_name, words in keywords.items():
        if any(w in title for w in words):
            matched_cat_name = cat_name
            break

    if matched_cat_name:
        # Find matching user category
        for c in categories:
            if c.name.lower() == matched_cat_name:
                predicted_category = c
                break

    # If no match, select Category with least active tasks to help balance
    if not predicted_category:
        cat_counts = []
        for c in categories:
            count = Todo.query.filter_by(category_id=c.id, completed=False).count()
            cat_counts.append((c, count))
        
        if cat_counts:
            cat_counts.sort(key=lambda x: x[1])
            predicted_category = cat_counts[0][0]

    if predicted_category:
        return jsonify({
            'category_id': predicted_category.id,
            'name': predicted_category.name,
            'color': predicted_category.color
        })
    else:
        return jsonify({'category_id': None, 'name': 'General'})
