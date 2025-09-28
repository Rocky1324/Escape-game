from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import re

TOTAL_QUESTIONS = 5


app = Flask(__name__)
app.secret_key = "My_secret_key"

# ---------------------------
# Base de données
# ---------------------------
def get_db():
    return sqlite3.connect("user.db")


def db_init():
    connect = get_db()
    cursor = connect.cursor()

    # Table des utilisateurs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    """)

    # Table des scores
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scores(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            victories INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )
    """)

    connect.commit()
    cursor.close()
    connect.close()


db_init()

# ---------------------------
# Questions / Réponses
# ---------------------------
question_reponse = {
    # Tectonique des plaques
    "Les dorsales sont des zones où les plaques tectoniques": "S'éloignent.",
    "Quelle est la conséquence principale des failles transformantes ?": "Tremblement de terre.",
    "Dans une zone de subduction, quelle plaque s'enfonce sous l'autre ?": "La plus lourde.",
    "Quel phénomène se produit lorsque deux plaques continentales entrent en collision ?": "Formation de chaînes de montagnes.",
    "Quelle est la vitesse moyenne de déplacement des plaques tectoniques ?": "Quelques centimètres par an.",
    "Quel type de frontière de plaque est associé à la formation de fosses océaniques ?": "Convergente (subduction).",

    # Volcans
    "Pourquoi les volcans se forment-ils souvent dans les zones de subduction ?": "Parce que la plaque qui s'enfonce libère du magma.",
    "Comment appelle-t-on une montagne formée par l'accumulation de lave ?": "Un volcan.",
    "Quelle roche sort des volcans lors des éruptions ?": "Le magma (lave).",
    "Quel type de volcan est caractérisé par des éruptions explosives et des pentes raides ?": "Un stratovolcan.",
    "Quel gaz est le plus couramment émis lors d'une éruption volcanique ?": "La vapeur d'eau (H₂O).",
    "Quel est le nom du volcan le plus actif d'Haïti ?": "La Soufrière (en réalité, Haïti n'a pas de volcan actif, mais la question peut servir à sensibiliser).",
    "Comment s'appelle la ceinture de volcans autour du Pacifique ?": "La ceinture de feu.",
    "Quel est le nom du supercontinent qui existait il y a 200 millions d'années ?": "La Pangée.",

    # Séismes
    "Quel instrument permet de mesurer les séismes ?": "Un sismographe.",
    "Sur quelle échelle mesure-t-on la magnitude des séismes ?": "L'échelle de Richter.",
    "Comment appelle-t-on l'onde la plus rapide générée par un séisme ?": "L'onde P.",
    "Comment appelle-t-on l'onde la plus destructrice lors d'un séisme ?": "L'onde S.",
    "Quelle énergie est libérée lors d'un séisme ?": "L'énergie élastique accumulée.",
    "Quel séisme majeur a frappé Haïti le 12 janvier 2010 ?": "Magnitude 7.0.",
    "Quelle ville d'Haïti a été la plus touchée par le séisme de 2010 ?": "Port-au-Prince.",
    "Quel type de faille provoque des séismes destructeurs comme en Haïti ?": "Faille transformante.",
    "Quel est le nom de la faille responsable du séisme de 2010 en Haïti ?": "La faille d'Enriquillo-Plantain Garden.",
    "Combien de personnes environ ont été touchées par le séisme de 2010 en Haïti ?": "Plus de 3 millions.",
    "Quel est le nom du tsunami dévastateur qui a suivi un séisme en 2004 dans l'océan Indien ?": "Tsunami de 2004.",
    "Quelle est la différence entre l'épicentre et l'hypocentre d'un séisme ?": "L'épicentre est à la surface, l'hypocentre est en profondeur.",

    # Géologie générale
    "Comment appelle-t-on la zone de fusion partielle des roches dans le manteau terrestre ?": "L'asthénosphère.",
    "Quelle est la couche la plus externe de la Terre ?": "La croûte terrestre.",
    "Quelle est la température approximative du noyau terrestre ?": "Environ 5000 à 6000 °C.",
    "Quel minéral est le plus abondant dans la croûte continentale ?": "Le feldspath.",

    # Haïti et la Caraïbe
    "Haïti est situé entre quelles plaques tectoniques principales ?": "La plaque Caraïbes et la plaque Nord-Américaine.",
    "Quel pays est le plus exposé aux séismes après Haïti dans la Caraïbe ?": "La République Dominicaine.",
    "Quelle île des Antilles est connue pour son volcan actif, la Soufrière ?": "La Guadeloupe.",
    "Quel est le nom du volcan actif situé en Martinique ?": "La Montagne Pelée.",
    "Quel phénomène naturel est souvent associé aux séismes sous-marins ?": "Les tsunamis.",

    # Prévention et sensibilisation
    "Quel est le premier réflexe à avoir en cas de séisme ?": "Se mettre à l'abri sous une table solide.",
    "Quel organisme international coordonne les secours en cas de catastrophe naturelle ?": "L'ONU (via des agences comme l'UNICEF ou la Croix-Rouge).",
    "Quel est l'objectif principal des exercices de simulation de séisme ?": "Préparer la population à réagir rapidement et efficacement.",
    "Quel type de construction résiste le mieux aux séismes ?": "Les bâtiments parasismiques.",

    # Divers
    "Quel type de mouvement crée les chaînes de montagnes comme l'Himalaya ?": "La collision de plaques.",
    "Quel est le nom du point où un séisme commence à se propager ?": "L'hypocentre.",
    "Quel est le nom de la théorie qui explique le mouvement des plaques tectoniques ?": "La tectonique des plaques.",
    "Quel océan est entouré par la ceinture de feu du Pacifique ?": "L'océan Pacifique.",
    "Quel est le nom du plus grand volcan actif du monde ?": "Mauna Loa (Hawaï).",
    "Quel est le nom du séisme le plus puissant jamais enregistré ?": "Séisme de Valdivia (1960, magnitude 9.5).",
}

# ---------------------------
# Narration progressive
# ---------------------------
narration = [
    "🌍 La terre tremble... ",
    "🏚️ Tu avances dans une rue effondrée, des débris bloquent le passage.",
    "🚧 Tu trouves un passage étroit entre deux bâtiments.",
    "🧍‍♂️ Tu aides une famille coincée sous les gravats.",
    "🚪 Tu vois enfin la sortie de la ville…",
    "Tu entres dans la ville fissurée... "
]

# Fonction pour normaliser les réponses
def normalize(text):
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    return text

# Fonction pour comparer les réponses de manière robuste
def compare_answers(user_answer, correct_answer):
    """
    Compare user answer with correct answer using multiple methods for robustness
    """
    if not user_answer or not correct_answer:
        return False
    
    # Method 1: Exact match (original)
    if user_answer.strip() == correct_answer.strip():
        return True
    
    # Method 2: Normalized comparison (remove punctuation and case)
    if normalize(user_answer) == normalize(correct_answer):
        return True
    
    # Method 3: Remove trailing punctuation and compare
    user_clean = user_answer.strip().rstrip('.,!?;:')
    correct_clean = correct_answer.strip().rstrip('.,!?;:')
    if user_clean == correct_clean:
        return True
    
    # Method 4: Check if user answer is contained in correct answer (for partial matches)
    if normalize(user_answer) in normalize(correct_answer):
        return True
    
    # Method 5: Check if correct answer is contained in user answer
    if normalize(correct_answer) in normalize(user_answer):
        return True
    
    return False

# ---------------------------
# Routes
# ---------------------------

        
ACCESS_CODE = "PROJETG52025!"

@app.before_request
def check_access():
    allowed_routes = ["access", "static"]  # pages accessibles sans code
    if request.endpoint not in allowed_routes and not session.get("access_granted"):
        return redirect(url_for("access"))


@app.route("/access", methods=["GET", "POST"])
def access():
    if request.method == "POST":
        code = request.form.get("code")
        if code == ACCESS_CODE:
            session["access_granted"] = True
            return redirect(url_for("main"))
        else:
            return render_template("access.html", error="❌ Code incorrect")
    return render_template("access.html")



@app.route("/")
def base():
    return render_template("base.html")

@app.route("/presentation")
def presentation():
    return render_template("presentation.html")

@app.route("/main")
def main():
    if "username" in session:
        return redirect(url_for("profil"))
    return render_template("main.html")

# ---------------------------
# Inscription
# ---------------------------
@app.route("/regist", methods=["GET", "POST"])
def regist():
    if request.method == "POST":
        username = request.form.get("username").strip()
        password = request.form.get("password")

        connect = get_db()
        cursor = connect.cursor()
        cursor.execute("SELECT id FROM user WHERE username = ?", (username,))
        if cursor.fetchone():
            return "⚠️ Nom d'utilisateur déjà utilisé"

        ash = generate_password_hash(password)
        cursor.execute("INSERT INTO user(username, password) VALUES(?, ?)", (username, ash))
        connect.commit()

        cursor.execute("SELECT id FROM user WHERE username = ?", (username,))
        user_id = cursor.fetchone()[0]

        session["user_id"] = user_id
        session["username"] = username
        session["score"] = 0
        session["questions_done"] = []  # suivi des questions déjà posées

        cursor.close()
        connect.close()
        return redirect(url_for("profil"))

    return render_template("regist.html")

# ---------------------------
# Connexion
# ---------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username").strip()
        password = request.form.get("password")

        connect = get_db()
        cursor = connect.cursor()
        cursor.execute("SELECT id, password FROM user WHERE username = ?", (username,))
        row = cursor.fetchone()

        if row and check_password_hash(row[1], password):
            session["user_id"] = row[0]
            session["username"] = username
            session["score"] = 0
            session["questions_done"] = []
            cursor.close()
            connect.close()
            return redirect(url_for("profil"))

        cursor.close()
        connect.close()
        return redirect(url_for("error"))

    return render_template("login.html")

# ---------------------------
# Déconnexion
# ---------------------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("main"))

# ---------------------------
# Profil
# ---------------------------
@app.route("/profil")
def profil():
    if "username" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]

    connect = get_db()
    cursor = connect.cursor()

    # Récupérer nombre total de victoires
    cursor.execute("SELECT victories FROM scores WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    victories = row[0] if row else 0

    # Récupérer nombre total de parties jouées
    cursor.execute("SELECT games_played FROM scores WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    total_games = row[0] if row else 0

    # Calcul du taux de réussite
    winrate = round((victories / total_games) * 100, 2) if total_games > 0 else 0

    cursor.close()
    connect.close()

    return render_template(
        "profil.html",
        username=session["username"],
        score=session.get("score", 0),
        victories=victories,
        winrate=winrate
    )


# ---------------------------
# Page d'erreur
# ---------------------------
@app.route("/error")
def error():
    return render_template("error.html")

# ---------------------------
# Quiz
# ---------------------------

    
@app.route("/quiz", methods=["GET", "POST"])
def quiz():
    if "username" not in session:
        return redirect(url_for("login"))

    total = 5
    progress = len(session.get("questions_done", []))

    # Si déjà terminé
    if progress >= total:
        if session.get("score", 0) == total:
            return redirect(url_for("victory"))
        else:
            return redirect(url_for("lose"))

    if request.method == "POST":
        reponse = request.form.get("reponse")
        question = session.get("question")
        bonne_reponse = question_reponse.get(question)

        # Debug information (remove in production)
        print(f"DEBUG - Question: {question}")
        print(f"DEBUG - User answer: '{reponse}'")
        print(f"DEBUG - Correct answer: '{bonne_reponse}'")
        print(f"DEBUG - Exact match: {reponse == bonne_reponse}")
        print(f"DEBUG - Normalized comparison: {normalize(reponse) == normalize(bonne_reponse)}")
        print(f"DEBUG - Robust comparison: {compare_answers(reponse, bonne_reponse)}")

        # FIXED LOGIC: Check answer first, then decide what to do
        is_correct = compare_answers(reponse, bonne_reponse)
        
        if is_correct:
            # Correct answer: increment score and add to questions_done
            session["score"] = session.get("score", 0) + 1
            session["questions_done"].append(question)
            feedback = "✔️ Bonne réponse !"
        else:
            # Wrong answer: don't add to questions_done, don't increment score
            feedback = f"❌ Mauvaise réponse. La bonne réponse était : {bonne_reponse}"
            # The question remains available for retry (it's not added to questions_done)

        progress = len(session["questions_done"])
        histoire = narration[progress - 1] if progress - 1 < len(narration) else ""

        return render_template(
            "quiz.html",
            question=question,
            options=session.get("options", []),
            feedback=feedback,
            score=session.get("score", 0),
            progress=progress,
            total=total,
            histoire=histoire
        )

    # GET → nouvelle question
    questions_dispo = [q for q in question_reponse if q not in session.get("questions_done", [])]
    question = random.choice(questions_dispo)
    bonne_reponse = question_reponse[question]

    autres_reponses = list(question_reponse.values())
    autres_reponses.remove(bonne_reponse)
    distracteurs = random.sample(autres_reponses, 2)

    options = [bonne_reponse] + distracteurs
    random.shuffle(options)

    session["question"] = question
    session["options"] = options

    progress = len(session.get("questions_done", []))
    histoire = narration[progress - 1] if progress - 1 < len(narration) else ""

    return render_template(
        "quiz.html",
        question=question,
        options=options,
        feedback=None,
        score=session.get("score", 0),
        progress=progress,
        total=total,
        histoire=histoire
    )




@app.route("/victory")
def victory():
    if "user_id" not in session:
        return redirect(url_for("login"))

    # Vérifier que la partie est vraiment finie et réussie
    if len(session.get("questions_done", [])) < 5 or session.get("score", 0) < 5:
        return redirect(url_for("quiz"))

    user_id = session["user_id"]
    connect = get_db()
    cursor = connect.cursor()

    cursor.execute("SELECT victories, games_played FROM scores WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()

    if row:
        victories = row[0] + 1
        games_played = row[1] + 1
        cursor.execute("UPDATE scores SET victories = ?, games_played = ? WHERE user_id = ?",
                       (victories, games_played, user_id))
    else:
        cursor.execute("INSERT INTO scores(user_id, victories, games_played) VALUES (?, ?, ?)", 
                       (user_id, 1, 1))

    connect.commit()
    cursor.close()
    connect.close()

    # Reset partie pour éviter refresh abusif
    session["score"] = 0
    session["questions_done"] = []

    return render_template("victory.html", username=session["username"], score=5)


@app.route("/lose")
def lose():
    if "user_id" not in session:
        return redirect(url_for("login"))

    # Vérifier qu'une partie a bien été jouée
    if len(session.get("questions_done", [])) < 5:
        return redirect(url_for("quiz"))

    user_id = session["user_id"]
    connect = get_db()
    cursor = connect.cursor()

    cursor.execute("SELECT games_played FROM scores WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()

    if row:
        games_played = row[0] + 1
        cursor.execute("UPDATE scores SET games_played = ? WHERE user_id = ?", (games_played, user_id))
    else:
        cursor.execute("INSERT INTO scores(user_id, victories, games_played) VALUES (?, ?, ?)", 
                       (user_id, 0, 1))

    connect.commit()
    cursor.close()
    connect.close()

    # Reset partie
    score_final = session.get("score", 0)
    session["score"] = 0
    session["questions_done"] = []

    return render_template("lose.html", score=score_final, username=session["username"])


@app.route("/retry")
def retry():
    if "username" not in session:
        return redirect(url_for("login"))

    # Réinitialiser la partie mais garder l'utilisateur connecté
    session["score"] = 0
    session["questions_done"] = []

    return redirect(url_for("quiz"))


@app.route("/leaderboard")
def leaderboard():
    connect = get_db()
    cursor = connect.cursor()
    cursor.execute("""
        SELECT user.username, scores.victories, scores.games_played
        FROM scores
        JOIN user ON scores.user_id = user.id
        ORDER BY scores.victories DESC, scores.games_played ASC
    """)
    leaderboard_data = cursor.fetchall()
    cursor.close()
    connect.close()

    return render_template("leaderboard.html", leaderboard=leaderboard_data)


# ---------------------------
# Lancer app
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)
