# Project structure

```
└── app (m)
    ├── user interface (m)
    |   ├── wizard (c)
    |   |   ├── search-for-the-area (c)
    |   |   ├── selection-of-the-area (c)
    |   |   ├── selection-of-od-pairs (c)
    |   |   ├── change-of-demand-and-weather (c)
    |   |   ├── simulation (c)
    |   |   └── statistics (c)
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