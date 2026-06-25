module.exports = {
  cooldown: 1,
  timeout: 360000,
  upgrade: true,
  target: (name) => {
    if (name === "@types/node") return "minor";

    return "latest";
  },
};
