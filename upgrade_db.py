import sqlite3

def upgrade_db():
    conn = sqlite3.connect('instance/todo.db')
    c = conn.cursor()

    try:
        c.execute("ALTER TABLE todo ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'")
        print("Added priority column")
    except sqlite3.OperationalError as e:
        print("Priority column error:", e)

    try:
        c.execute("ALTER TABLE todo ADD COLUMN category VARCHAR(50) DEFAULT 'General'")
        print("Added category column")
    except sqlite3.OperationalError as e:
        print("Category column error:", e)

    try:
        c.execute("ALTER TABLE todo ADD COLUMN due_date DATETIME")
        print("Added due_date column")
    except sqlite3.OperationalError as e:
        print("Due date column error:", e)

    conn.commit()
    conn.close()
    print("Database upgraded successfully!")

if __name__ == '__main__':
    upgrade_db()
