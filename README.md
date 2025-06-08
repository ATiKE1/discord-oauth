# 🔐 Flask Discord OAuth

Hi! This is my next small project. This time - authorization via OAuth Discord, for Flask. For test added mini user profile with view username, avatar picture and roles on a specific server.

# 🔧 Requirements
- [Flask-Discord](https://github.com/weibeu/Flask-Discord) - Discord OAuth2 extension for Flask
- `Python 3`
- `Flask` - is a lightweight WSGI web application framework

# 🚀 How to Run?

## 1. Specify the token and other specific data of your discord application
```python
app.config["DISCORD_CLIENT_ID"] = DISCORD_CLIENT_ID
app.config["DISCORD_CLIENT_SECRET"] = DISCORD_CLIENT_SECRET
app.config["DISCORD_REDIRECT_URI"] = "http://127.0.0.1:5000/callback"
app.config["DISCORD_BOT_TOKEN"] = DISCORD_BOT_TOKEN

app.config["DISCORD_SCOPE"] = ["identify", "guilds"]

GUILD_ID = DISCORD_GUILD_ID
```
## 2. Run the project by running the command
```bash
flask app.py
```
or
```bash
python app.py
```
## 3. Goto 👉 `http://127.0.0.1:5000` in your browser

# ❤️ I Like You