import os

from flask import Flask, redirect, url_for, render_template, session
from flask_discord import DiscordOAuth2Session, requires_authorization, Unauthorized

try:
    import config
except ImportError:
    config = None


def setting(name, default=None):
    """Read a setting from config.py first, then from the environment."""
    return getattr(config, name, None) or os.environ.get(name, default)


DISCORD_CLIENT_ID = setting("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = setting("DISCORD_CLIENT_SECRET")
DISCORD_BOT_TOKEN = setting("DISCORD_BOT_TOKEN")
DISCORD_GUILD_ID = setting("DISCORD_GUILD_ID")

app = Flask(__name__)

app.secret_key = setting("FLASK_SECRET_KEY", "random bytes representing flask secret key")
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "true"

app.config["DISCORD_CLIENT_ID"] = DISCORD_CLIENT_ID
app.config["DISCORD_CLIENT_SECRET"] = DISCORD_CLIENT_SECRET
app.config["DISCORD_REDIRECT_URI"] = setting("DISCORD_REDIRECT_URI", "http://127.0.0.1:5000/callback")
app.config["DISCORD_BOT_TOKEN"] = DISCORD_BOT_TOKEN

app.config["DISCORD_SCOPE"] = ["identify", "guilds"]

GUILD_ID = DISCORD_GUILD_ID
DISCORD_ENABLED = bool(DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET)

discord = DiscordOAuth2Session(app)

@app.route("/login/")
def login():
    if not DISCORD_ENABLED:
        return redirect(url_for("homepage"))
    return discord.create_session(scope=app.config["DISCORD_SCOPE"])

@app.route("/callback/")
def callback():
    discord.callback()
    session.pop("guest", None)
    user = discord.fetch_user()
    welcome_user(user)
    return redirect(url_for("homepage"))

@app.route("/guest/")
def guest():
    session["guest"] = True
    return redirect(url_for("homepage"))

@app.errorhandler(Unauthorized)
def redirect_unauthorized(e):
    return redirect(url_for("homepage"))

@app.route("/logout/")
def logout():
    session.pop("guest", None)
    if discord.authorized:
        discord.revoke()
    return redirect(url_for("homepage"))

@app.route("/user/")
@requires_authorization
def user():
    user = discord.fetch_user()

    member_data = discord.bot_request(f"/guilds/{GUILD_ID}/members/{user.id}")

    if not member_data or isinstance(member_data, str):
        return f"<p>Error get user data</p><a href='/logout/'><button>Logout</button></a>"

    role_ids = member_data.get("roles", [])

    guild_roles = discord.bot_request(f"/guilds/{GUILD_ID}/roles")

    if not isinstance(guild_roles, list) or isinstance(guild_roles, str):
        return f"<p>Error get user roles</p><a href='/logout/'><button>Logout</button></a>"

    role_dict = {role["id"]: {"name": role["name"]} for role in guild_roles}
    roles_info = [role_dict[role_id] for role_id in role_ids if role_id in role_dict]

    return render_template(
        "user.html",
        user=user,
        roles=roles_info,
    )

@app.route("/")
def homepage():
    gardener = None
    if DISCORD_ENABLED and discord.authorized:
        user = discord.fetch_user()
        gardener = {
            "id": str(user.id),
            "name": user.name,
            "avatar": user.avatar_url or user.default_avatar_url,
            "guest": False,
        }
    elif session.get("guest"):
        gardener = {"id": "guest", "name": "Guest", "avatar": None, "guest": True}

    return render_template("garden.html", gardener=gardener, discord_enabled=DISCORD_ENABLED)

def welcome_user(user):
    if not DISCORD_BOT_TOKEN:
        return None
    try:
        dm_channel = discord.bot_request("/users/@me/channels", "POST", json={"recipient_id": user.id})
        return discord.bot_request(
            f"/channels/{dm_channel['id']}/messages", "POST", json={"content": "Success auth on the site"}
        )
    except Exception:
        # A failed welcome DM (closed DMs, missing bot) must not block sign-in.
        return None

if __name__ == "__main__":
    app.run(debug=True)
