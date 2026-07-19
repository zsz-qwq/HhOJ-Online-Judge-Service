name: Test Judge

on:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      
      - name: Install deps
        run: |
          sudo apt-get update
          sudo apt-get install -y g++ curl
          pip install -r requirements.txt || true
      
      - name: Test URL
        run: |
          echo "Testing: ${{ secrets.HHOJ_API_URL }}"
          curl -v --connect-timeout 10 "${{ secrets.HHOJ_API_URL }}" 2>&1 | head -20
      
      - name: Run
        run: |
          python3 judge.py \
            --site-url "${{ secrets.HHOJ_API_URL }}" \
            --api-key "${{ secrets.HHOJ_API_KEY }}" \
            --work-dir ./work
