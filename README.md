![No Fuss - Hacktober Poster](./docs/assets/readme-poster.png)

# No Fuss - Static Site Builder

*No Fuss* is a simple static website builder, aiming to provide you with only the features you need, without any bloat. This project is part of the *Hacktober 2020* effort to contribute to open-source. Everyone is welcome to join the project.

## How It Works

An important goal of the project is to be well documented and easy to follow for developers who are looking to learn, or to contribute.

[Read How It Works](./docs/README.md)

## Goals

- [x] Transform simple assets like `pug` templates or `less` files
- [x] Fast and light weight - currently the package weighs only **7.4kb**.
- [x] Minimal core, pluggable architecture
- [x] Finger print assets
- [x] Live-reload development server
- [x] No complicated frameworks
- [x] 100% test code coverage

# Usage

```bash
# Yarn
yarn add -D no-fuss
yarn fuss [command] [options]

# NPM
npm i -D no-fuss
npx fuss [command] [options]
```

## Commands

- `watch` - Watch files and incrementally build
- `build` - Build files once
- `serve` - Run the development server with live reload. This is the default command.

## Options

| Option          | Meaning                                |
| --------------- | -------------------------------------- |
| `-s, --src-dir` | Source directory (default is `./src`)  |
| `-o, --out-dir` | Output directory (default is `./dist`) |
| `-p, --port`    | Port (only used with `serve`)          |

---

## License

MIT
