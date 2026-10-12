# HeroUI integration notes

HeroUI v3.2.6 was selected for the camera-console redesign. The package supports React 19 and Tailwind CSS v4. HeroUI v3 does not require a provider wrapper; components work after installing the package and importing its style entrypoint.

The implementation uses the documented `Button`, `Card`, and `Input` primitives. Existing clinical workflow logic remains outside those presentation primitives.

Sources:

- [HeroUI framework setup](https://heroui.com/en/docs/react/getting-started/frameworks)
- [HeroUI Button](https://heroui.com/en/docs/react/components/button)
- [HeroUI Card](https://heroui.com/en/docs/react/components/card)
- [HeroUI Input](https://heroui.com/en/docs/react/components/input)
- [HeroUI Select](https://heroui.com/en/docs/react/components/select)
- [HeroUI React package README](https://www.npmjs.com/package/@heroui/react)
