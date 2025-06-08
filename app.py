import os

from flask import Flask, redirect, url_for, render_template
from flask_discord import DiscordOAuth2Session, requires_authorization, Unauthorized

from config import DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID

app = Flask(__name__)

app.secret_key = b"random bytes representing flask secret key"
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "true"

app.config["DISCORD_CLIENT_ID"] = DISCORD_CLIENT_ID
app.config["DISCORD_CLIENT_SECRET"] = DISCORD_CLIENT_SECRET
app.config["DISCORD_REDIRECT_URI"] = "http://127.0.0.1:5000/callback"
app.config["DISCORD_BOT_TOKEN"] = DISCORD_BOT_TOKEN

app.config["DISCORD_SCOPE"] = ["identify", "guilds"]

GUILD_ID = DISCORD_GUILD_ID

discord = DiscordOAuth2Session(app)

@app.route("/login/")
def login():
    return discord.create_session()

@app.route("/callback/")
def callback():
    discord.callback()
    user = discord.fetch_user()
    welcome_user(user)
    return redirect(url_for(".user"))

@app.errorhandler(Unauthorized)
def redirect_unauthorized(e):
    return redirect(url_for("homepage"))

@app.route("/logout/")
def logout():
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
    return """
    <html>
        <head>
            <title>Discord OAuth</title>
        </head>
        <body>
            <a href='/login/'><button>Log In via Discord</button></a>
        </body>
    </html>
    """

def welcome_user(user):
    dm_channel = discord.bot_request("/users/@me/channels", "POST", json={"recipient_id": user.id})
    return discord.bot_request(
        f"/channels/{dm_channel['id']}/messages", "POST", json={"content": "Success auth on the site"}
    )

if __name__ == "__main__":
    app.run(debug=True)