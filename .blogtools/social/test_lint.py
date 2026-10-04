"""python3 -m unittest test_lint   (from .blogtools/social)"""
import json, pathlib, unittest

import lint

ROOT = pathlib.Path(__file__).resolve().parent


def good_deck():
    return {'format': 'minimal', 'slides': [
        {'hook': '80% of u have the **wrong** sun sign'},
        {'beat': True, 'eyebrow': 'AUTO', 'h': 'the zodiac **slipped**', 'big': '24°', 'cap': 'since the old charts'},
        {'beat': True, 'h': 'two lists', 'list': ['one', 'two']},
        {'cta': {'h': 'check urs', 'p': 'free, 30 seconds', 'btn': 'asktota.com'}},
    ], 'caption': 'short caption.\n\n#asktota'}


class Words(unittest.TestCase):
    def test_marks_do_not_count(self):
        self.assertEqual(lint.words('ur **big** ~~three~~ ++now++'), 4)

    def test_lists_and_none(self):
        self.assertEqual(lint.words(['a b', None, 'c']), 3)

    def test_middot_is_not_a_word(self):
        self.assertEqual(lint.words('1 · 2'), 2)


class Decks(unittest.TestCase):
    def test_good_deck_passes(self):
        self.assertEqual(lint.decks({'x': good_deck()}), [])

    def test_cover_must_be_a_hook(self):
        d = good_deck(); d['slides'][0] = {'beat': True, 'h': 'not a hook'}
        self.assertTrue(any('slide 1 must be a hook' in p for p in lint.decks({'x': d})))

    def test_long_hook_fails(self):
        d = good_deck(); d['slides'][0]['hook'] = ' '.join(['word'] * 11)
        self.assertTrue(any('hook is 11 words' in p for p in lint.decks({'x': d})))

    def test_paragraphs_banned(self):
        d = good_deck(); d['slides'][1]['copy'] = 'a paragraph'
        self.assertTrue(any('"copy" is not allowed' in p for p in lint.decks({'x': d})))

    def test_dense_beat_fails(self):
        d = good_deck(); d['slides'][1]['note'] = ' '.join(['w'] * 15)
        probs = lint.decks({'x': d})
        self.assertTrue(any('note is 15 words' in p for p in probs))

    def test_long_caption_fails(self):
        d = good_deck(); d['caption'] = ' '.join(['w'] * 50) + '\n#asktota'
        self.assertTrue(any('caption is 50 words' in p for p in lint.decks({'x': d})))

    def test_legacy_decks_skip_density_rules(self):
        legacy = {'slides': [{'h': 'x', 'copy': ' '.join(['w'] * 80)}]}
        self.assertEqual(lint.decks({'old': legacy}), [])

    def test_entity_caught_everywhere(self):
        legacy = {'slides': [{'h': 'a &middot; b'}]}
        self.assertTrue(any('&middot;' in p for p in lint.decks({'old': legacy})))

    def test_em_dash_caught(self):
        legacy = {'slides': [{'h': 'a — b'}]}
        self.assertTrue(any('em dash' in p for p in lint.decks({'old': legacy})))


class Reels(unittest.TestCase):
    def reel(self):
        return {'decks': {'r': {'minimal': True, 'hook': ['are u in', 'sade sati?'],
                                'cards': [{'tag': 'aries moon', 'line': 'it just started'}]}}}

    def test_good_reel_passes(self):
        self.assertEqual(lint.reels(self.reel()), [])

    def test_card_sub_banned(self):
        r = self.reel(); r['decks']['r']['cards'][0]['sub'] = 'more words'
        self.assertTrue(any('no sub line' in p for p in lint.reels(r)))

    def test_long_line_fails(self):
        r = self.reel(); r['decks']['r']['cards'][0]['line'] = ' '.join(['w'] * 10)
        self.assertTrue(any('line is 10 words' in p for p in lint.reels(r)))


class Myths(unittest.TestCase):
    def week(self):
        return {'weeks': [{'n': 4, 'cover': 'ur colour list is **40 years old**',
                           'myths': [{'id': 'a', 'myth': 'it is ancient', 'receipts': 'it spread through newspapers.'}]}]}

    def test_good_week_passes(self):
        self.assertEqual(lint.myths(self.week()), [])

    def test_long_receipts_fail(self):
        w = self.week(); w['weeks'][0]['myths'][0]['receipts'] = ' '.join(['w'] * 23)
        self.assertTrue(any('receipts are 23 words' in p for p in lint.myths(w)))

    def test_unrewritten_weeks_skip_rules(self):
        w = self.week(); del w['weeks'][0]['cover']; w['weeks'][0]['myths'][0]['receipts'] = ' '.join(['w'] * 60)
        self.assertEqual(lint.myths(w), [])


class RealData(unittest.TestCase):
    def test_repo_data_is_clean(self):
        self.assertEqual(lint.everything(), [])


if __name__ == '__main__':
    unittest.main()
