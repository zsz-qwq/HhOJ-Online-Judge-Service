import os
import subprocess
import time

class CRunner:
    def __init__(self):
        pass

    def compile(self, code, sub_dir):
        src_path = os.path.join(sub_dir, 'main.c')
        exe_path = os.path.join(sub_dir, 'main')

        with open(src_path, 'w', encoding='utf-8') as f:
            f.write(code)

        cmd = ['gcc', '-O2', '-std=c11', src_path, '-o', exe_path]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode != 0:
                return False, result.stderr
            return True, ''
        except subprocess.TimeoutExpired:
            return False, 'Compilation timed out'
        except Exception as e:
            return False, str(e)

    def run(self, sub_dir, in_path, time_limit_ms, memory_limit_kb):
        exe_path = os.path.join(sub_dir, 'main')
        out_path = os.path.join(sub_dir, 'user.out')
        err_path = os.path.join(sub_dir, 'user.err')

        time_limit_s = time_limit_ms / 1000.0
        memory_limit_bytes = memory_limit_kb * 1024

        try:
            with open(in_path, 'r', encoding='utf-8') as fin, \
                 open(out_path, 'w', encoding='utf-8') as fout, \
                 open(err_path, 'w', encoding='utf-8') as ferr:

                start_time = time.time()
                proc = subprocess.Popen(
                    [exe_path],
                    stdin=fin,
                    stdout=fout,
                    stderr=ferr,
                    preexec_fn=self._set_memory_limit(memory_limit_bytes)
                )

                try:
                    proc.wait(timeout=time_limit_s)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()
                    return 'TLE', 0, 0

                elapsed_ms = int((time.time() - start_time) * 1000)
                memory_used = self._get_memory_usage(proc.pid)

                if proc.returncode != 0:
                    return 'RE', elapsed_ms, memory_used

                if memory_used > memory_limit_kb:
                    return 'MLE', elapsed_ms, memory_used

                return 'OK', elapsed_ms, memory_used

        except Exception as e:
            return 'RE', 0, 0

    def _set_memory_limit(self, limit_bytes):
        def set_limit():
            try:
                import resource
                resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))
            except Exception:
                pass
        return set_limit

    def _get_memory_usage(self, pid):
        try:
            import psutil
            process = psutil.Process(pid)
            memory_info = process.memory_info()
            return int(memory_info.rss / 1024)
        except Exception:
            return 0
