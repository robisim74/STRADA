# Project structure

```
└── app (m)
    ├── user interface (m)
    |   ├── wizard (c)
    |   |   ├── search-for-the-area (c)
    |   |   ├── selection-of-the-area (c)
    |   |   ├── estimate-of-demand (c)
    |   |   ├── change-of-conditions (c)
    |   |   ├── simulation (c)
    |   |   ├── statistics (c)
    |   |   └── wizard (s)
    |   ├── map (c)
    |   |   ├── map (s)
    |   |   └── google-map (c)
    |   └── weather (c)
    ├── location (m)
    |   └── location (s)
    ├── network (m)
    |   ├── network (s)
    |   ├── graph
    |   └── weather (m)
    |       └──weather (s)
    ├── demand (m)
    |   └── demand (s)
    └── simulation (m)
        ├── simulation (s)
        └── clock
```